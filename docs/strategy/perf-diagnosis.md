# Perf Diagnosis — Diagnóstico antes de decidir rebuild vs fix
Date: 2026-05-13  
Branch: `experiment/design-features`  
Signal del usuario: "todo se siente lento" en `npm run dev`

## TL;DR

**Lo que la evidencia dice hoy:** los cuellos de botella reales son **cinco**, ninguno de ellos es "deck.gl es lento". Cuatro de los cinco se arreglan sin tocar arquitectura. El quinto (cascada de React Query en overlays) es refactor localizado, no rebuild.

**Probabilidad de que un rebuild from-scratch resuelva la lentitud sin volver a los mismos problemas: baja (~20%).** Los cuellos son patrones de carga + falta de atlas + dev mode, no decisiones estructurales.

**Recomendación operativa:**
1. Antes de cualquier decisión, **medir en prod** vía `npm run preview` (5 minutos).
2. Si prod ya se siente bien → 60–80% del problema era dev mode + falta de `optimizeDeps`, no la app.
3. Si prod sigue lento → atacar el TOP-5 abajo en orden de coste/beneficio. Total estimado: ~5–8 días de trabajo concentrado.
4. Rebuild solo se justifica si después del TOP-5 sigue habiendo lentitud arquitectónica medible (no "sensación").

## Evidencia estática (números reales del repo)

### Build de producción (5m ago)

```
router-CWjWoRLo.js               1,261.87 kB │ gzip: 345.70 kB
GraphEdgeContext-Cw1p9N2g.js       197.61 kB │ gzip:  64.55 kB
webgl-device-BkMKHp4r.js           190.81 kB │ gzip:  53.47 kB
index-D1HzAuQx.js                  181.61 kB │ gzip:  57.61 kB
PowerMapOverlayHost.js             166.92 kB │ gzip:  57.75 kB
```

Critical path en frío (sin code-split del router): **~1.6 MB raw / ~456 KB gzip**. Para referencia: Linear, Slack, Notion están en 1–3 MB. No es "demasiado", pero el `router` chunk de 1.26 MB es **el sospechoso #1** porque contiene `@tanstack/react-router` + `xstate` + `framer-motion` + el shell entero, todo en uno.

### Assets en `public/`

- **273 logos** en `public/logos/` (PNG/JPEG/SVG sin atlas)
- **56 fotos** en `public/persons/`
- **`countries-110m.geojson` = 246 KB** (parse en cada cold-load del globo)

### Vite config (`vite.config.ts`)

```ts
optimizeDeps: {
  include: [
    '@xyflow/react',
    'd3-force',
    'd3-quadtree',
    'three',
  ],
}
```

**Faltan en `optimizeDeps.include`** (todo lo cual fuerza re-bundling esbuild on-demand en dev):
- `@deck.gl/core`, `@deck.gl/layers` (~190 KB chunk)
- `framer-motion` (carga en cada overlay)
- `@tanstack/react-router` (1.26 MB chunk)
- `xstate`, `@xstate/react`
- `@tanstack/react-query`

Cada uno de estos puede agregar **1–5 segundos** la primera vez que se importan en dev (el comentario en el propio archivo lo dice). Tres + ya en la lista, pero los más pesados están afuera.

### IconLayer del globo (`GlobeBridge.ts:910`)

```ts
new IconLayer({
  id: 'globe-company-icons',
  ...
  getIcon: (d: any) => ({
    url:     d.iconUrl,   // ← per-entity URL, no atlas
    width:   64,
    ...
  }),
})
```

**Esto es el anti-patrón que el skill `deck-gl-icon-layer` advierte explícitamente.** Cuando el globo monta, deck.gl dispara **una request HTTP individual por cada `iconUrl`**. Con 30 empresas + 15 personas = **45 fetches paralelos**, cada uno parseado a textura WebGL individual. En dev mode con servidor local lento o conexión móvil, esto es 2–4 segundos sólo de carga de iconos.

### Cascada de React Query en CompanyOverlay (`useCompanyData.ts`)

`CompanyOverlayHost` invoca **12 hooks** simultáneamente al abrir el overlay:

```
useCompanyById
useCompanySectors
useCompanyMarkets
useCompanyFabrics
useCompanyProducts
useCompanyProviders
useCompanyClients
useCompanies
useCompanyOci
useCompanyRiskProfile
useCompanyCommodity
useCompanyTimelines
```

React Query los paraleliza, pero el overlay sólo termina de renderizar cuando todos resuelven o erroran. En desarrollo contra backend local en `https://localhost:32777` (via proxy en `vite.config.ts`), si **un solo endpoint** tarda 800 ms, el overlay tarda 800 ms — porque el `loading || !company` gate de `CompanyOverlayHost.tsx:94` espera a que `useCompanyById` resuelva.

### Idle preload — contraproducente en cold-start

```tsx
useEffect(() => {
  const preload = () => {
    void import('@/features/graph-view/GraphViewPanel')
    void import('./GoldOverlayHost')
    void import('./CompanyOverlayHost')
    void import('./HeadquartersOverlayHost')
  }
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(preload, { timeout: 2000 })
  }
}, [])
```

Bien intencionado, pero en una máquina lenta el `requestIdleCallback` se ejecuta a los pocos cientos de ms del cold-load, en plena curva de carga del globo. Eso significa que cuando deck.gl está fetcheando 45 iconos + parseando GeoJSON, el navegador **también** está bajando + parseando 4 chunks de overlays que ni siquiera necesitas todavía. Compiten por CPU.

## TOP-5 cuellos en orden de cost/benefit

| # | Problema | Impacto estimado | Tiempo de fix | Riesgo | Estado |
|---|---|---|---|---|---|
| 1 | **Dev mode mal configurado** — falta deck.gl, framer-motion, react-router en `optimizeDeps.include` | -2 a -5 s de cold-start en dev | 5 min | Nulo | ✅ aplicado 2026-05-13 |
| 2 | **Idle preload corre en cold-start** — los 4 `void import()` compiten con el globo por CPU mientras carga | -200 a -800 ms en cold-start | 10 min | Bajo | ✅ aplicado 2026-05-13 (gated por `engineActive`) |
| 3 | **~~IconLayer sin atlas~~** ⛔ **REVISADO — NO APLICA** | n/a | n/a | n/a | Cancelado |
| 4 | **React Query cascade en CompanyOverlay** | -300 a -2000 ms del click al render completo del overlay | 2 días (`Promise.all` real + render con skeletons en lugar de bloqueo total) | Bajo | Pendiente |
| 5 | **`router` chunk de 1.26 MB** | -300 a -800 ms de parse en cold-start | 2 días (manual `rolldownOptions.output.codeSplitting` + lazy del shell) | Bajo | Pendiente |
| 6 | **Regresiones funcionales reportadas 2026-05-13** — picking falla cerca de entidad seleccionada, arcs no salen del pin, CSS desactualizadas | varía | medir antes de estimar | medio | Pendiente (debug) |

### Por qué #3 quedó cancelado

El skill canónico del repo [`.claude/skills/deck-gl-icon-layer/SKILL.md`](../../.claude/skills/deck-gl-icon-layer/SKILL.md) establece:

- **Opción B (URL por entity)** es **"el patrón usado hoy en iPM"** y aplica `<50 entidades`.
- **Opción A (atlas pre-construido)**: "cuando el globo tenga >50 logos simultáneos **y midas drop de FPS**".

Hoy iPM tiene 5 `iconUrl` (en `AppShell.DECKGL_ICONS`). Las otras 25 empresas y 15 personas se renderizan como dots vía `globe-rings` + `globe-dots`, que es **exactamente la Opción C híbrida** que el skill recomienda como óptima. Construir un atlas para 5 entradas es más costoso (build step + mantenimiento) que dejar las 5 requests sueltas; el navegador las cachea desde el primer paint.

El estimado original de "-1 a -3 s + memoria GPU 3x" suponía 45 iconos. Con 5, el impacto medible es probablemente <100 ms al cold-start. No vale el día de trabajo.

**Si en el futuro suben los logos a 50+ simultáneos**, entonces sí: re-abrir #3 con atlas según la sección "Opción A" del skill, **después** de medir un drop real de FPS, no antes.

Total estimado revisado: **4–5 días** (#4 + #5 + #6 debug) para que la app cargue en <3 s y responda como esperás.

## Lo que un rebuild NO arregla

Si rehacés todo desde cero con el mismo stack (React + deck.gl + xstate + react-router + framer-motion), volves a chocar con:
- IconLayer sin atlas (anti-patrón general de deck.gl)
- React Query cascades (patrón natural cuando un dominio tiene 12 sub-entidades)
- Bundle del router pesando porque metiste xstate adentro
- Dev mode sin `optimizeDeps`

Es decir: 4 de los 5 cuellos los repetirías. Lo único que un rebuild te "compra" gratis es decisiones de UX/diseño nuevas — pero eso podés hacerlo también incrementalmente sobre lo actual.

## Lo que un rebuild SÍ podría justificar

Sólo si **alguna** de estas tres cosas es cierta:
1. La estructura de tipos / contratos / dominio que copiaste de v3 ya no representa lo que quieres construir → cualquier feature nueva pelea contra el modelo viejo.
2. Querés cambiar el stack base (React → Solid, deck.gl → un motor propio WebGL, etc.) por una razón concreta y medible.
3. La codebase tiene tanta deuda técnica que el ratio (tiempo en fixes) / (tiempo en features) > 50%.

Hoy ninguna de las tres se ha mostrado en evidencia. La conversación arrancó con un Sprint 2 + Day 0-1 + Day 2 que fueron 100% greenfield sobre la arquitectura actual. Si la arquitectura fuera estructuralmente mala, esos no se hubieran integrado limpiamente.

## Protocolo de medición — 15 minutos, dos terminales

Ejecuta esto antes de decidir nada.

### Terminal 1 — prod build local

```powershell
npm run build
npm run preview
```

Vite serve `dist/` en `http://localhost:5178`. Es **el mismo bundle que produciría Vercel/cualquier hosting**.

### Terminal 2 — DevTools

Abrí Chrome en `http://localhost:5178/workstation` con DevTools desde antes (Performance + Network paneles).

**Mide los 5 puntos siguientes** y anotalo en `day1-profiling-baseline.md` (estaba esperándote):

| Escenario | Métrica | Umbral OK |
|---|---|---|
| A — Hard refresh, esperar globo girando | Time-to-first-rotation | < 3.5 s |
| B — Globo idle, sin interactuar | FPS sostenido | ≥ 55 |
| C — Click una empresa (ej. Apple) | Click → overlay completo | < 1.5 s |
| D — Cerrar overlay | Cierre → 60 FPS recuperado | < 400 ms |
| E — Tab Network (ReactFlow ahora) | Tab click → grafo renderizado | < 2 s |

### Decisión

- **Todos OK** → la app es razonable hoy, no necesita rebuild, sí necesita TOP-5 #1 y #2 (30 min de trabajo).
- **A falla, resto OK** → atacar TOP-5 #3 (icon atlas) + #5 (chunk split). 3 días.
- **C falla, resto OK** → atacar TOP-5 #4 (React Query cascade). 2 días.
- **Todos fallan en prod** → entonces sí hay razón para repensar arquitectura. Hablamos.

## Acción inmediata recomendada (10 minutos)

Si querés que esto deje de doler hoy mientras decides el camino largo, hay **dos cambios triviales que muerden ya**:

1. Ampliar `optimizeDeps.include` en `vite.config.ts`:
   ```ts
   optimizeDeps: {
     include: [
       '@xyflow/react', 'd3-force', 'd3-quadtree', 'three',
       '@deck.gl/core', '@deck.gl/layers',
       'framer-motion',
       '@tanstack/react-router', '@tanstack/react-query',
       'xstate', '@xstate/react',
     ],
   },
   ```
   Restart `npm run dev` → el primer cold-start tarda 10–15 s más (esbuild pre-bundleando todo), después es persistentemente más rápido en cada hot-reload. Ese costo se paga UNA vez al día.

2. Retrasar el idle-preload hasta después del `ENGINE.READY`:
   En `AppShell.tsx:329`, reemplazar el `useEffect` para que sólo se dispare cuando el motor emita `READY`. Con eso la CPU del cold-start está dedicada al globo, no a chunks que abrís 30s después.

Ninguno de los dos toca el modelo, contratos, app.machine ni nada estructural. Son 10 minutos, reversibles, y deberían recuperarte la diferencia entre "se siente lento" y "se siente OK" en dev.

---

## Conclusión honesta

No te voy a decir "no reescribas" porque sería paternalista. Te voy a decir lo siguiente:

- La sensación de lentitud que estás teniendo es **real**, pero la **atribución** ("deck.gl es lento") **no está respaldada por evidencia**. Los datos apuntan a otras 4 cosas antes que a deck.gl.
- Antes de decidir tirar 4 semanas de trabajo, **15 minutos de medición en prod** valen la pena. Si después de medir prod sigue lento, hablamos de rebuild con datos.
- Si decides rebuild igual, tu instinto puede tener razón por otros motivos (dirección de producto, arquitectura de dominio, stack). Pero "performance" probablemente no sea ese motivo.

Tu llamada.
