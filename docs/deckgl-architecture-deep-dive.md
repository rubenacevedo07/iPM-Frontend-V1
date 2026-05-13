# DeckGL / GlobeBridge — Architecture Deep Dive

> Documento generado para la refactorización. Refleja el estado exacto del código a 2026-05-13.

---

## 1. Mapa completo del sistema

```
AppShell.tsx
  ├─ CMD.SET_ENTITIES ──────────────────────────────────────────────┐
  ├─ CMD.SET_ROTATION (Rule 7)                                       │
  └─ CMD.SET_FOCUS ─────────────────────────────────────────────────▼
                                                             GlobeBridge.ts
engineManager.machine.ts                                        │
  ├─ recibe ENGINE.ENTITY_CLICK ─────────────────────────────────── │
  ├─ forwardEntityClick → app.machine (ATLAS.ENTITY_CLICK)          │
  ├─ CMD.SET_FOCUS ──────────────────────────────────────────────── │ (wired)
  └─ isEntityClick guard                                            ▼
                                                         entitySpread.ts
app.machine.ts                                    computeDisplayPositions()
  ├─ ATLAS.ENTITY_CLICK → navRef (URL change)           │
  ├─ overlay = 'gold'  → GoldOverlayHost                │
  └─ overlay = 'company' → CompanyOverlayHost           ▼
                                              _displayEntities[] (DisplayEntity)
GoldOverlayHost.tsx                                      │
  └─ seed = usePersonsMap().find(id)      _computeVisibleEntities()
     // if personsLoading → return null                  │ (hemisphere filter)
                                                         │ Filtra SOLO por cámara, NUNCA por _focusedId
CompanyOverlayHost.tsx                                   │
  └─ useCompanyById(id) + 6 hooks                        ▼
     // if loading → return null         visibleEntities[] → orderedVisible[] → DeckGL layers
```

---

## 2. GlobeBridge — Campos privados completos

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `_status` | `'pending'\|'ready'\|'disposed'\|'failed'` | Ciclo de vida del bridge |
| `_handlers` | `Array<fn>` | Listeners de eventos registrados |
| `_deck` | `Deck<any> \| null` | Instancia DeckGL |
| `_canvas` | `HTMLCanvasElement \| null` | Canvas DOM |
| `_ro` | `ResizeObserver \| null` | Observer de resize del canvas |
| `_viewState` | `any` | ViewState actual (longitude, latitude, zoom) |
| `_rafHandle` | `number \| null` | Handle del rAF de rotación |
| `_lastTickMs` | `number` | Timestamp del último tick (delta-time) |
| `_selfDriving` | `boolean` | Previene recursión en writeback de viewState |
| `_idleResumeTimer` | `ReturnType<setTimeout> \| null` | Timer de idle resume (800ms) |
| `_userInteracting` | `boolean` | Flag de interacción de usuario activa |
| `_focusedId` | `string \| null` | nodeId de entidad enfocada (set en `_flyTo` y `CMD.SET_FOCUS`) |
| `_hoveredId` | `string \| null` | nodeId de entidad en hover |
| `_clickEntity` | `any` | Entidad en animación de click ripple |
| `_clickAnimStart` | `number` | Timestamp inicio ripple |
| `_clickAnimRAF` | `number \| null` | Handle rAF del ripple |
| `_pendingEvents` | `BridgeEvent[]` | Buffer para antes de que haya handlers |
| `_entities` | `EngineEntityData['entities']` | Array raw de entrada (referencia) |
| `_displayEntities` | `DisplayEntity[]` | Array spread (posiciones visuales) |
| `_arcs` | `EngineArc[]` | Arcos de red |
| `_arcsRevision` | `number` | Contador monotónico para updateTriggers |
| `_activePowerMapId` | `string \| null` | PowerMap activo |
| `_pmEntities` | `PowerMapEntity[]` | Entidades del powermap activo |
| `_pmEdges` | `PowerMapEdge[]` | Aristas del powermap activo |
| `_rotationEnabled` | `boolean` | Flag Rule 7 |
| `_flyToTimer` | `ReturnType<setTimeout> \| null` | Timer de fly-to |
| `_flyToCancelled` | `boolean` | Aborta el fly-to en curso |
| `_arrivalCoords` | `[number,number] \| null` | Origen del pulse dorado post-fly-to |
| `_arrivalAnimStart` | `number` | Timestamp inicio pulse llegada |
| `_arrivalAnimRAF` | `number \| null` | Handle rAF pulse llegada |
| `_idleArcs` | `Array<{src,dst,phase}>` | Arcos idle (animación de fondo) |
| `_idleAnimTime` | `number` | Fase de la animación idle |
| `_idleInterval` | `ReturnType<setInterval> \| null` | Interval del idle |

---

## 3. Flujo de entidades

```
CMD.SET_ENTITIES (EngineEntityData.entities[])
        │
        ├── _entities = command.data.entities  [ref. assignment, no copy]
        │
        ├── _displayEntities = computeDisplayPositions(_entities)
        │       │
        │       ├── buildClusters(): union-find, threshold 50km
        │       └── spreadCluster(): geodesic rings
        │               Ring 1: 200km, max 6 entidades
        │               Ring 2: 340km, max 10 entidades
        │               Ring 3: 480km, max 14 entidades
        │               (geometricamente estable desde zoom 1.5+)
        │
        ├── _idleArcs = _buildIdleArcs()
        │
        └── _redraw()
                │
                └── _buildLayers()
                        │
                        └── visibleEntities = _computeVisibleEntities()
                                │ dot-product hemisférico, threshold -0.1 (~96°)
                                │ Filtra SOLO por cámara, NUNCA por _focusedId
                                │
                                ├─ orderedVisible = focused entity last (picking fix)
                                │
                                ├── globe-rings  (pickable, dynamicRadius, depthTest:false)
                                ├── globe-dots   (no pickable, 30km, excluye iconUrl)
                                └── globe-company-icons (IconLayer, último en array)
```

---

## 4. Sistema de capas — orden completo en `_buildLayers()`

| # | ID | Tipo | Pickable | Datos | depthTest | Radio / Notas |
|---|----|----|----------|-------|-----------|---------------|
| 1 | `globe-base` | GeoJsonLayer | No | GLOBE_BASE_GEOJSON | default | Fondo oscuro |
| 2 | `globe-countries` | GeoJsonLayer | No | /data/countries-110m.geojson | default | Bordes + fills |
| 3 | `globe-arcs` | ArcLayer | No | `_arcs` | default | Red supplier/client |
| 4 | `globe-selected-halo` | ScatterplotLayer | No | visibleEntities filtrado por `_focusedId` | default | 300km, solo visual |
| 5 | `globe-rings` | ScatterplotLayer | **Sí** | **`orderedVisible`** | **false** | **`dynamicRadius`**, picking principal |
| 6 | `globe-dots` | ScatterplotLayer | No | visibleEntities sin iconUrl | default | 30km, decorativo |
| 7 | `globe-pm-halo` | ScatterplotLayer | No | `_pmEntities` | **false** | PowerMap glow |
| 8 | `globe-pm-rings` | ScatterplotLayer | **Sí** | `_pmEntities` | **false** | 7-9px, PowerMap |
| 9 | `globe-pm-arcs` | ArcLayer | No | `_pmEdges` | **false** | Red PowerMap |
| 10 | `globe-arrival-pulse` | ScatterplotLayer | No | condicional | default | 50km→570km dorado |
| 11 | `globe-click-ripple-{0,1,2}` | ScatterplotLayer | No | condicional (3 rings) | default | 80km→450km cian |
| 12 | `globe-company-icons` | IconLayer | No | visibleEntities COMPANY+iconUrl | **false** | Logos, billboard:true |

**Cambios respecto a estado anterior:**
- `globe-rings`: `depthTest: false` (antes default) — permite que el orden del array `data` controle el picking buffer en lugar del z-buffer
- `globe-rings`: `getRadius: dynamicRadius` (antes `120_000` fijo)
- `globe-rings`: `data: orderedVisible` (antes `visibleEntities`)

---

## 5. Sistema de picking — análisis completo

### Configuración actual
```typescript
// Deck constructor
pickingRadius: 8  // px de tolerancia extra alrededor de geometría

// globe-rings
pickable: true
radiusUnits: 'meters'
parameters: { depthTest: false }  // last draw wins in picking buffer
getRadius: dynamicRadius          // función del zoom, ~24px en pantalla
data: orderedVisible              // entidad enfocada al final → gana picking buffer solo donde no hay vecina encima
```

### Radio dinámico — fórmula
```typescript
const SCREEN_TARGET_PX = 24
const EARTH_C = 40_075_000
const metersPerPx = (EARTH_C * Math.cos(_lat * Math.PI / 180)) / Math.pow(2, _zoom + 8)
const dynamicRadius = Math.max(30_000, Math.min(120_000, SCREEN_TARGET_PX * metersPerPx))
```

### Conversión metros → píxeles según zoom
```
pixeles = metros / (EARTH_CIRCUMFERENCE × cos(lat) / 2^(zoom+8))
```

| Zoom | metersPerPx (lat=40°) | dynamicRadius | Radio en pantalla |
|------|----------------------|---------------|-------------------|
| 1.0 | ~35,000 m/px | 120,000m (capped) | ~3.4px → clamp a mín |
| 2.0 | ~17,500 m/px | 120,000m (capped) | ~6.9px |
| 2.8 (post fly-to) | ~10,000 m/px | 120,000m (capped) | ~12px |
| 3.5 | ~6,200 m/px | 120,000m (capped) | ~19px |
| 4.5 | ~3,100 m/px | 74,400m | ~24px ← target |
| 6.0 | ~1,100 m/px | 26,400m → clamp a 30,000m | ~24px |

**Nota:** A zoom ≤ 4.5 el clamp 120km se activa — el radio no sigue la fórmula. El beneficio principal del `depthTest: false` + reordenado es que la entidad en posición N en el array puede ser "pisada" por la N+1 en el picking buffer donde se solapan, sin importar el radio.

### depthTest: false — cómo funciona el picking

Con `depthTest: true` (default): DeckGL dibuja en el picking buffer en orden, pero usa el z-buffer para resolver qué fragmento "gana". El disco más cercano a la cámara (en 3D) gana. En un globo, las entidades en la misma capa tienen profundidades similares → resultado impredecible.

Con `depthTest: false`: No hay z-buffer. El último fragmento dibujado sobreescribe. La entidad al final del array `data` sobreescribe a todas las anteriores donde se solapan.

### orderedVisible — reordenado para picking
```typescript
const orderedVisible = this._focusedId
  ? [
      ...visibleEntities.filter((d: any) => d.nodeId !== this._focusedId),
      ...visibleEntities.filter((d: any) => d.nodeId === this._focusedId),
    ]
  : visibleEntities;
```

Cuando hay una entidad enfocada, se coloca última. Con `depthTest: false`, su disco sobreescribe en el picking buffer donde no hay vecina encima. Las vecinas que están "más arriba" en el array (antes de la enfocada) sobreescriben a la enfocada donde se solapan — haciéndolas clickeables.

### onHover (líneas 274-289)
```typescript
onHover: (info) => {
  const hoveredNodeId =
    (info.layer?.id === 'globe-rings' || info.layer?.id === 'globe-pm-rings') && info.object
      ? (info.object.nodeId ?? info.object.id ?? null)
      : null
  if (hoveredNodeId === this._hoveredId) return   // dedup por nodeId
  this._hoveredId = hoveredNodeId
  this._emitOrBuffer({ type: 'ENGINE.ENTITY_HOVER', entity: ... })
  this._redraw()
}
```

### onClick (líneas 266-272)
```typescript
onClick: (info) => {
  if (info.layer?.id === 'globe-rings' && info.object) {
    this._flyTo(info.object)                          // cinematic + sets _focusedId
    this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity: info.object })
    this._startClickAnim(info.object)                 // ripple cian
  }
  // globe-pm-rings: hover sí, click NO
}
```

---

## 6. Sistema fly-to / focus

### _flyTo() (línea ~1087)
```typescript
private _flyTo(target: { nodeId: string }): void {
  const entity = this._entities.find(e => e.nodeId === target.nodeId)
  // ⚠️ Busca en _entities (raw, lat/lng original HQ)
  // NO en _displayEntities (spread positions)
  this._focusedId = target.nodeId  // ← sets focusedId BEFORE fly; enables orderedVisible
  this._executeFlyTo(entity.longitude, entity.latitude, 2.8, 1800, () => {
    this._startArrivalPulse(entity.longitude, entity.latitude)
  })
}
```

**NOTA:** `_flyTo` hace fly al lat/lng HQ original, pero la entidad se renderiza en `displayLng/displayLat` (posición spread). Si la entidad está en un cluster, el globo vuela a HQ pero el pin se ve en la posición spread (hasta 200km de distancia). El halo de 300km cubre ambas posiciones, pero visualmente puede ser confuso.

### _executeFlyTo() (línea ~1103)
- Easing: quad-in/out `t < 0.5 ? 2t² : -1 + (4-2t)t`
- Duración: 1800ms
- Zoom target: 2.8
- `_selfDriving = true` durante cada frame (evita writeback recursivo)
- Al completar: `_userInteracting = false`, NO reinicia rotación (Rule 7)

### CMD.SET_FOCUS — cadena completa
```
AppShell.tsx
  useEffect(() => {
    if (!search.overlay) engineRef.send({ type: 'CMD.SET_FOCUS', target: null })
  }, [search.overlay])
        │
        ▼
engineManager.machine.ts
  'CMD.SET_FOCUS': {
    actions: ({ context, event }) => {
      context.bridge?.send({ type: 'CMD.SET_FOCUS', target: event.target })
    }
  }
        │
        ▼
GlobeBridge.ts
  case 'CMD.SET_FOCUS':
    this._focusedId = command.target?.nodeId ?? null
    this._redraw()
```

Al cerrar cualquier overlay (`search.overlay` → undefined), AppShell envía `CMD.SET_FOCUS { target: null }` → `_focusedId` se limpia → `orderedVisible` vuelve al orden original.

### setFocus() — qué NO hace
- **NO modifica `_displayEntities`** — solo `_focusedId`
- **NO filtra entidades cercanas** — todas siguen pickables
- **NO cambia el radio de globe-rings** — sigue usando dynamicRadius para todas

---

## 7. Contratos del bridge

### BridgeEvent (emitidos)
```typescript
| { type: 'ENGINE.READY';        engineId: EngineId }
| { type: 'ENGINE.ERROR';        engineId: EngineId; error: Error }
| { type: 'ENGINE.ENTITY_CLICK'; entity: EntityRef }
| { type: 'ENGINE.ENTITY_HOVER'; entity: EntityRef | null }
```

### BridgeCommand (recibidos)
```typescript
| { type: 'CMD.SET_VIEW';              view: AtlasView }
| { type: 'CMD.SET_FOCUS';             target: EntityRef | null }
| { type: 'CMD.SET_ENTITIES';          data: EngineEntityData }
| { type: 'CMD.SET_ARCS';              data: EngineArcData }
| { type: 'CMD.SET_GRAPH';             data: GraphEngineData }      // no-op en globe
| { type: 'CMD.SET_COMPANY_SELECTION'; data: ... }                  // no-op en globe
| { type: 'CMD.SUSPEND' }
| { type: 'CMD.RESUME' }
| { type: 'CMD.DISPOSE' }
| { type: 'CMD.SET_POWERMAP';    powermapId: string | null }
| { type: 'CMD.FLY_TO';          longitude: number; latitude: number; zoom?: number; duration?: number }
| { type: 'CMD.SET_ROTATION';    enabled: boolean }
```

### EntityRef (payload de click)
```typescript
type EntityRef = {
  id:                 number
  nodeId:             string
  type:               'PERSON' | 'COMPANY' | 'COUNTRY'
  slug:               string
  name:               string
  isGold?:            boolean
  coLocatedCompanyId?: number
  // ⚠️ NO incluye: photoUrl, title, compositeScore, archetypeCode, etc.
}
```

### EngineEntityData.entities (fields completos)
```typescript
{
  id:                  number      // ⚠️ number aquí, pero RawEntity.id es string
  nodeId:              string
  type:                'PERSON' | 'COMPANY' | 'COUNTRY'
  slug:                string
  name:                string
  latitude:            number
  longitude:           number
  marketCapUsd?:       number | null
  isChokepoint?:       boolean
  isGold?:             boolean
  iconUrl?:            string      // ✓ presente, filtra en globe-dots y globe-company-icons
  coLocatedCompanyId?: number
}
```

---

## 8. Fix — Click en entidades cercanas (RESUELTO)

### Diagnóstico previo (estado roto)
Post fly-to (zoom=2.8), el radio de `globe-rings` en pantalla era ~90px.
Las entidades del mismo cluster están a mínimo ~130px de separación (173km × escala zoom).
El margen clickeable para la entidad vecina era ~40px (130-90), reducido a ~32px con `pickingRadius:8`.

**La entidad enfocada actuaba como una "zona muerta" que bloqueaba clicks en sus vecinas.**

Con `depthTest: true` (default), el z-buffer resolvía los solapamientos usando profundidad 3D — no array order. Las entidades en el mismo globo tienen profundidades similares → comportamiento impredecible.

### Fix aplicado (dos partes)

**Parte 1 — `_focusedId` nunca se seteaba**

`_flyTo()` era llamado directamente desde el onClick sin pasar por `setFocus()`. El campo `_focusedId` permanecía `null`. El array `orderedVisible` no reordenaba nada.

Fix: `this._focusedId = target.nodeId` añadido al inicio de `_flyTo()`.

**Parte 2 — `depthTest: false` en `globe-rings`**

Con `depthTest: false`, el picking buffer usa draw order, no z-buffer. La entidad al final del array (`orderedVisible` coloca la enfocada al final) "gana" en su propio centro. Las vecinas que aparecen antes en el array "ganan" en los píxeles donde sus discos se solapan con el de la enfocada.

```typescript
new ScatterplotLayer({
  id: 'globe-rings',
  data: orderedVisible,           // enfocada al final
  pickable: true,
  parameters: { depthTest: false } as any,  // draw order wins
  radiusUnits: 'meters',
  getRadius: dynamicRadius,
  // ...
})
```

### Verificación (debug log)
Debug log temporal (ya eliminado) confirmó el flujo correcto:
- `focusedId: "person:173"` ✓ (antes era `null`)
- `lastInOrdered: "person:173"` ✓ (enfocada al final)
- `dynamicRadiusKm: 120` — en zoom 2.8 el radio sigue en el clamp superior, pero con `depthTest: false` el orden importa más que el radio

---

## 9. Bug raíz — GoldOverlay foto con demora

### Diagnóstico
El overlay de persona usa dos paths distintos con timing diferente:

**Path A — GoldOverlay (funciona bien):**
```
GoldOverlayHost.tsx
  └─ seed = usePersonsMap().persons.find(p => p.id === id)
      │  // PersonMapDto tiene: fullName, photoUrl, title, globalRank, etc.
      │  // Cargado en app start desde /data/persons_top_15.json
      └─ <GoldOverlay seed={seed} />
              └─ PersonLeftPanel person={intel ?? seed}
                 // Si seed existe → renderiza con foto+nombre INMEDIATAMENTE
                 // intel carga en paralelo (API), no bloquea el render inicial
```

**Path B — Cuando NO hay seed:**
```
EntityRef (del click del globo) solo tiene: id, nodeId, type, slug, name
  └─ NO tiene: photoUrl, title, compositeScore, archetypeCode, ...
  └─ GoldOverlay recibe seed=null
      └─ PersonLeftPanel: isLoading=true hasta que intel carga → muestra initials fallback
```

### Fix aplicado

`GoldOverlayHost.tsx`: `if (personsLoading) return null` — el overlay no monta hasta que `usePersonsMap` resuelve, garantizando que `seed` siempre tiene `photoUrl` cuando el overlay aparece.

`GoldOverlay.tsx`: `isLoading={intelLoading && !seed?.photoUrl}` — la foto del seed se muestra inmediatamente; el spinner solo aplica si no hay foto del seed.

---

## 10. RawEntity.id — mismatch de tipos

**Problema conocido** (confirmado en TypeScript error preexistente línea 406):
- `EngineEntityData.entities[i].id` es `number`
- `RawEntity.id` en entitySpread.ts es `string`
- GlobeBridge pasa `command.data.entities` directamente a `computeDisplayPositions()` que espera `RawEntity[]`
- El sort en `spreadCluster()` hace `String(id)` (línea 141 entitySpread.ts) precisamente por esto

No rompe el runtime pero sí TypeScript. A documentar para el refactor.

---

## 11. Overlays — sistema de skeletons (eliminado)

### Estado anterior
Todos los overlays mostraban un skeleton layout durante la carga inicial (`CompanyOverlaySkeleton`, `GoldOverlaySkeleton`). El efecto visual era una sombra del layout apareciendo antes del contenido real — considerado disruptivo.

### Estado actual
- Todos los Suspense boundaries tienen `fallback={null}`
- `CompanyOverlayHost`: `if (loading || !company) return null`
- `GoldOverlayHost`: `if (personsLoading) return null`
- Los overlays aparecen solo cuando tienen datos — sin flash de skeleton

### Animaciones de entrada — todos los overlays

**GoldOverlay (`gov__root`)**
```tsx
// Panel izquierdo (.gov__panel-wrap)
<motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
            transition={{ duration:0.32, ease:[0.25,0.46,0.45,0.94], delay:0 }}>

// Panel derecho (.gov__right)
<motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }}
            transition={{ duration:0.32, ease:[0.25,0.46,0.45,0.94], delay:0.08 }}>

// Panel inferior (.gov__bottom)
<motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.32, ease:[0.25,0.46,0.45,0.94], delay:0.16 }}>
```

**HeadquartersView (`sr__root`)**
```tsx
// Panel izquierdo (CompactProfilePanel)
<motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
            transition={{ delay:0 }}>

// Centro (HeadquartersCenter)
<motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:0.06 }}>

// Panel derecho (CompactCompanyPanel)
<motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }}
            transition={{ delay:0.12 }}>
```

**AppShell (todos los overlays — outer wrapper)**
```tsx
initial={{ opacity: 0, y: 18 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
```

---

## 12. Animaciones — sistemas del globo

### Click ripple (globe-click-ripple-0/1/2)
- 3 anillos con delay 0/200/400ms
- Cada anillo: 80km → 450km en 700ms, alpha 180 → 0
- Color: cian [0,229,255]
- Duración total: 1200ms
- Posición: `entity.longitude/latitude` (HQ, no display)

### Arrival pulse (globe-arrival-pulse)
- 1 anillo: 50km → 570km en 1000ms
- Alpha: cuadrático (1-t)² × 200
- Color: dorado [245,195,60]
- Se dispara al completar el fly-to
- Posición: `lng/lat` target del fly-to (HQ)

### Idle arcs
- 18 arcos pseudo-random entre las 30 primeras entidades
- setInterval loop, ~60fps via _redraw()
- Se regeneran en cada CMD.SET_ENTITIES

---

## 13. Resumen de bugs y estado

| Bug | Estado | Fix | Archivo |
|-----|--------|-----|---------|
| Click en entidades cercanas post-zoom (depthTest) | **RESUELTO** | `depthTest:false` + `orderedVisible` | `GlobeBridge.ts` `_buildLayers()` |
| `_focusedId` nunca seteado desde click | **RESUELTO** | `this._focusedId = target.nodeId` en `_flyTo()` | `GlobeBridge.ts` `_flyTo()` |
| `CMD.SET_FOCUS` sin handler en engineManager | **RESUELTO** | Evento + handler añadidos a `engineManager.machine.ts` | `engineManager.machine.ts` |
| GoldOverlay foto tarda 8s | **RESUELTO** | `if (personsLoading) return null` + `isLoading` guard mejorado | `GoldOverlayHost.tsx`, `GoldOverlay.tsx` |
| Overlays sin animación de entrada | **RESUELTO** | motion.div stagger en GoldOverlay + HeadquartersView | `GoldOverlay.tsx`, `HeadquartersView.tsx` |
| HQ overlay domain hardcodeado | **RESUELTO** | `person?.influenceDomain ?? '—'` | `CompactProfilePanel.tsx:108` |
| HQ overlay Companies vacío con header huérfano | **RESUELTO** | Condicional `{companies.length > 0 && ...}` | `CompactProfilePanel.tsx:114-127` |
| HQ overlay edgeNote undefined durante carga | **RESUELTO** | Fallbacks `'…'` | `HeadquartersView.tsx:42` |
| Icono visible a través del globo | RESUELTO | CPU hemisphere culling (`_computeVisibleEntities`) | `GlobeBridge.ts` |
| Cursor pointer en territorio incorrecto | RESUELTO | CPU hemisphere culling | `GlobeBridge.ts` |
| Dot azul bajo logo | RESUELTO | Filtro `!d.iconUrl` en globe-dots | `GlobeBridge.ts` |
| Skeletons disruptivos en carga | RESUELTO | `fallback={null}` + early `return null` en hosts | `AppShell.tsx`, `CompanyOverlayHost.tsx`, `GoldOverlayHost.tsx` |
| RawEntity.id type mismatch | PENDIENTE | String cast en spreadCluster; arreglar en refactor | `GlobeBridge.ts:406`, `entitySpread.ts:141` |
| `_flyTo` vuela a HQ no a display position | PENDIENTE | Buscar en `_displayEntities` en lugar de `_entities` | `GlobeBridge.ts` `_flyTo()` |

---

## 14. Líneas de referencia críticas en GlobeBridge.ts

| Función | Líneas |
|---------|--------|
| Deck constructor | 191-289 |
| `pickingRadius` | 198 |
| `CMD.SET_FOCUS` | 401-403 |
| `CMD.SET_ENTITIES` | 404-409 |
| `CMD.SET_ROTATION` (Rule 7) | 429-468 |
| `_computeVisibleEntities()` | 524-539 |
| `_buildLayers()` start | 541 |
| `const visibleEntities` | 546 |
| `dynamicRadius` cálculo | 558 |
| `orderedVisible` | 563-568 |
| `globe-selected-halo` | ~641-659 |
| `globe-rings` (depthTest:false, orderedVisible, dynamicRadius) | ~683 |
| `globe-dots` | ~686-701 |
| `globe-pm-rings` | ~719-743 |
| `onHover` | 274-289 |
| `onClick` | 266-272 |
| `_flyTo()` (sets `_focusedId`) | ~1087 |
| `_executeFlyTo()` | ~1103 |
| `_startClickAnim()` | ~929-946 |
| `_startArrivalPulse()` | ~870-886 |
| `_startRAFRotation()` | ~973-1026 |
| `_armIdleResume()` | ~1042-1051 |
