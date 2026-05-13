---
name: deck-gl-icon-layer
description: >
  Formatos de imagen, tamaños y estrategias de carga para DeckGL IconLayer
  en el globo de iPM. Load BEFORE adding any IconLayer to GlobeBridge.ts,
  before normalizing public/logos/, or before deciding atlas-vs-per-entity
  loading. Triggers on: IconLayer, getIcon, iconAtlas, iconMapping, company
  logos, /logos/, /persons/, WebP, atlas pre-built, 64x64, sprite sheet,
  texture size, alpha channel, SVG rasterize, brandfetch, squoosh, clearbit.
---

# deck.gl IconLayer — Formatos, tamaños y estrategias para logos en el globo

## TL;DR

- **Formato:** **WebP 64×64** con alpha. PNG 64×64 si no tienes pipeline para WebP.
- **Estrategia:** `getIcon` con URL por entity para <50 entidades. Atlas pre-construido para 50+.
- **Fallback:** dejar el `ScatterplotLayer` existente debajo. Si el logo falla, el dot cian sigue visible (degradación elegante).
- **Helper a reusar:** [`getCompanyImage(name)`](../../src/types/_ext/entityImages.ts#L144) ya resuelve `nombre → URL` con múltiples slug strategies.

## Formatos soportados

`IconLayer` usa internamente **WebGL textures**, así que solo acepta lo que el navegador puede cargar como `HTMLImageElement` y subir a GPU.

| Formato | DeckGL | Recomendado | Por qué |
|---------|--------|-------------|---------|
| **PNG**  | ✅ | ✅ Sí | Transparencia, lossless, soporte universal |
| **WebP** | ✅ | ✅ **Sí (mejor)** | 25-35% más pequeño que PNG con misma calidad, transparencia |
| **JPEG** | ✅ | ⚠️ Solo si no necesitas transparencia | Sin canal alpha → fondo blanco visible sobre globo oscuro |
| **SVG**  | ❌ | ❌ No | DeckGL necesita raster bitmap, no vector. Rasterizar a PNG/WebP primero |
| **GIF**  | ✅ | ❌ | Innecesariamente grande, solo 256 colores |

**Regla:** si vas a añadir un logo nuevo, conviértelo a WebP 64×64 antes de meterlo en `public/logos/`.

## Tamaño óptimo: 64×64 px

| Aspecto | Cálculo |
|---|---|
| Memoria GPU | 30 logos × 64² × 4 bytes RGBA = **491 KB en VRAM** (barato) |
| Atlas posible | 512×512 cabe 8×8 = 64 slots → **1 sola textura, 1 draw call** |
| Peso archivo WebP | 2-4 KB por logo → 30 logos = **~100 KB transferidos** total |
| Pantalla a zoom medio | Logo se ve a ~24-32 px → 64 px da **DPR 2× con margen** para zoom-in |

**No subir a 128 o 256 px** salvo que vayas a hacer zoom muy cerca. Para el globo a escala mundial, 64 px es siempre suficiente.

## Estrategias de carga (cuál usar)

### Opción A — Atlas pre-construido
Sprite-sheet (`logos-atlas.webp` 512×512) + JSON mapping (`logos-mapping.json` con `{ apple: {x,y,width,height}, ... }`).

- **Pro:** 1 textura GPU, 1 draw call → óptimo para 50+ entidades.
- **Con:** requiere build step (script Node con `sharp`) que regenera el atlas al añadir logos.
- **Cuándo:** cuando el globo tenga >50 logos simultáneos y midas drop de FPS.

### Opción B — `getIcon` con URL por entity
Cada entity lleva `iconUrl: '/logos/apple.webp'`. DeckGL carga texturas individualmente y las cachea.

- **Pro:** cero infraestructura. Funciona inmediatamente.
- **Con:** N requests iniciales (cacheados por el navegador después).
- **Cuándo:** <50 entidades. **Es el patrón usado hoy en iPM.**

### Opción C — Híbrido (recomendado)
`IconLayer` (Opción B) **encima** del `ScatterplotLayer` existente. El dot cian sigue siendo el picker y el fallback visual.

- **Pro:** degradación elegante: si el logo 404, el dot cian queda visible debajo. Cero rotura.
- **Con:** doble layer (impacto despreciable a 30-50 entidades).
- **Cuándo:** **siempre que estés migrando dots → iconos**. Permite roll-back instantáneo.

## Trampas conocidas (aprende del pasado)

1. **SVG no funciona en `IconLayer`** aunque sí funcione en `<img>`. Necesita raster. Si tienes `Apple_Logo_0.svg`, ráster a `apple.webp` con [Squoosh.app](https://squoosh.app) o `sharp`.

2. **JPEG con fondo blanco rompe la estética** del globo oscuro. Sin canal alpha el fondo blanco se ve como un cuadrado encima del globo. Convertir a WebP/PNG con alpha o rechazar el asset.

3. **Logos rectangulares se distorsionan en sprites cuadrados.** Microsoft, Coca-Cola, etc. tienen aspect ratio horizontal. Solución: **cuadrar con padding transparente** al normalizar (`fit: 'contain'` en sharp, `background: { r:0, g:0, b:0, alpha:0 }`).

4. **`getIcon` retorna objeto, no string.** Debe devolver `{ url, width, height, anchorX, anchorY, mask }`. Anchor en centro = `width/2, height/2`. Si retornas solo string, DeckGL no sabe dimensiones y falla en silencio.

5. **`mask: true` tiñe el logo con `getColor`.** Si quieres los colores reales del logo (Apple gris, Microsoft cuatro colores), usa `mask: false`. Si quieres un icono monocromo coloreable, usa `mask: true` + `getColor`.

6. **`sizeUnits: 'meters'` hace que el logo desaparezca al alejarse del zoom.** Para iconos siempre visibles del mismo tamaño, usa `sizeUnits: 'pixels'`.

7. **Iconos cortados diagonalmente sobre `_GlobeView`.** Síntoma: el sprite aparece recortado en una línea oblicua, como si una mitad estuviera "detrás" de la esfera. Hay **dos causas distintas** que pueden darse juntas:
   - **Causa A — orientación del sprite:** `IconLayer` por defecto orienta el sprite al plano tangente del punto sobre la esfera; cuando ese plano se inclina, parte del sprite cae "detrás". **Fix A:** `billboard: true` — fuerza el sprite a quedar siempre paralelo al plano de cámara.
   - **Causa B — depth buffer:** la geometría de la esfera del globo escribe en el depth buffer; el sprite, aunque esté encima visualmente, puede fallar el depth test y quedar recortado. **Fix B:** `parameters: { depthTest: false }` en el `IconLayer`.
   - **Fix completo (ambas causas):** aplicar ambas props + mover el `IconLayer` al final del array `getLayers()` para que se renderice encima de todas las demás capas. Aplicar también a `TextLayer` por la misma razón.

## Fuentes para encontrar logos faltantes

| Fuente | URL | Cuándo usarla |
|---|---|---|
| **Wikimedia Commons** | commons.wikimedia.org | Logos de empresas grandes. PNG/SVG gratis, licencia CC casi siempre permite uso comercial. |
| **Brandfetch** | brandfetch.com/`<domain>` | API gratuita por dominio. SVG + PNG con variantes light/dark. Hasta 1000 lookups/mes gratis. |
| **Clearbit Logo API** | logo.clearbit.com/`<domain>.com` | PNG 128×128 al vuelo, sin auth. **Descargar y guardar local** — no depender en runtime. |
| **simpleicons.org** | simpleicons.org | >2700 logos monocromos SVG, naming consistente. Ideal para iconos limpios sin colores corporativos. |
| **vectorlogo.zone** | vectorlogo.zone | SVGs de logos tech, naming `<empresa>.svg`. |
| **Sitio oficial de la empresa** | (press kit / brand assets) | Cumplimiento de marca asegurado. PNGs en alta resolución. |
| **Squoosh.app** | squoosh.app | Web app de Google para **convertir/redimensionar a WebP** con preview en vivo. Drag & drop, sin instalación. Recomendado para 1-2 logos manuales. |

## Cómo automatizar (agente para muchos logos)

Para >5 logos pendientes, vale la pena un script Node:

```ts
// scripts/add-logos.ts — npm run logos:add -- nvidia palantir
import sharp from 'sharp'
import fetch from 'node-fetch'
import { writeFileSync } from 'node:fs'

const slugs = process.argv.slice(2)

for (const slug of slugs) {
  // 1. Descargar desde Brandfetch o Clearbit
  const res = await fetch(`https://logo.clearbit.com/${slug}.com?size=256`)
  const buf = Buffer.from(await res.arrayBuffer())

  // 2. Convertir a WebP 64×64 cuadrado con alpha
  const webp = await sharp(buf)
    .resize(64, 64, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 90 })
    .toBuffer()

  // 3. Guardar
  writeFileSync(`public/logos/${slug}.webp`, webp)
  console.log(`✓ ${slug}.webp`)
}

// 4. Manualmente: añadir slug al array COMPANY_FILES en
//    src/types/_ext/entityImages.ts (o auto-generar el array
//    leyendo el directorio en build time).
```

**Dependencias:** `npm i -D sharp node-fetch@2`.

**Cuándo usarlo:** ≥5 logos a añadir. Para 1-2, manual con Squoosh.app es más rápido y no requiere instalar deps.

## Pattern para añadir UN logo (manual, recomendado para empezar)

1. Buscar el PNG/SVG fuente (Wikimedia, brand kit oficial, etc.).
2. Abrir [squoosh.app](https://squoosh.app).
3. Drag & drop la imagen.
4. **Resize** → 64×64, `fit: contain`, fondo transparente.
5. **Format** → WebP, quality 90.
6. **Download** como `<slug>.webp`.
7. Mover a `public/logos/<slug>.webp`.
8. Añadir `<slug>.webp` al array `COMPANY_FILES` en [entityImages.ts](../../src/types/_ext/entityImages.ts#L34).
9. El helper `getCompanyImage(name)` lo encuentra automáticamente.

## Referencia rápida: snippet de IconLayer en iPM

```ts
import { IconLayer } from '@deck.gl/layers'

new IconLayer({
  id: 'globe-company-icons',
  data: this._displayEntities.filter(d => d.type === 'COMPANY' && d.iconUrl),
  pickable: false,                              // picking sigue en globe-rings
  billboard: true,                              // CRITICAL en _GlobeView: si no, el sprite se corta diagonal
  getPosition: (d) => [d.displayLng, d.displayLat],
  getIcon: (d) => ({
    url:     d.iconUrl,
    width:   64,
    height:  64,
    anchorX: 32,
    anchorY: 32,
    mask:    false,                             // colores reales del logo
  }),
  getSize: 28,                                  // tamaño en pantalla
  sizeUnits: 'pixels',
  updateTriggers: {
    getPosition: [this._displayEntities],
    getIcon:     [this._displayEntities.length],
  },
}),
```

Aplicado encima de `globe-rings` (línea ~670 de [GlobeBridge.ts](../../src/engine/GlobeBridge.ts)). Mantén `globe-rings` y `globe-dots` intactos como fallback visual + picker.
