# Regressions Audit — 2026-05-13

Status: **Diagnóstico**. No se ha aplicado ningún fix todavía. Decisiones de fix → en otra ronda, una vez decidido el orden.

Síntomas reportados por el usuario tras Step 4:

1. "no puedo seleccionar un pin en el deckgl si esta cerca de la entidad seleccionada"
2. "los arcs no salen del pin seleccionado"
3. "alguna propiedad css no actualizada"

---

## Bug #1 — Picking falla cerca de la entidad seleccionada

**Severidad:** Alta. Funcional.
**Estado:** **CONFIRMADO** — bug determinístico, reproducible al 100%.
**Coordenadas:** `src/engine/GlobeBridge.ts` líneas **603–611**.

### Cadena de causación

1. Click sobre una entidad ⇒ `onClick` (línea 277) llama `_flyTo(info.object)`.
2. `_flyTo` internamente hace `this._focusedId = target.nodeId` (línea 1132). El fly-to es el ÚNICO sitio donde `_focusedId` se setea con un valor no-null. `CMD.SET_FOCUS` desde AppShell sólo limpia (línea 290), nunca setea.
3. Una vez `_focusedId` está poblado, `_buildStaticLayersImpl` reordena el array de datos del layer `globe-rings`:

```603:611:src/engine/GlobeBridge.ts
    const orderedVisible = this._focusedId
      ? [
          ...visibleEntities.filter((d: any) => d.nodeId !== this._focusedId),
          ...visibleEntities.filter((d: any) => d.nodeId === this._focusedId),
        ]
      : visibleEntities;
```

El comentario inmediatamente arriba dice:

> Put the focused entity LAST in the data array so that when its disc overlaps a neighbour's disc in the picking buffer, **the neighbour (drawn earlier) wins the hit test** — enabling re-selection of nearby entities.

### Por qué el comentario está al revés

El layer tiene `parameters: { depthTest: false }` (línea 733). Con depthTest desactivado, tanto el render visual como el render del pick buffer usan semántica estándar de overwrite: **el último fragmento escrito en un píxel gana**. No hay z-buffer que decida qué pasada gana. Por tanto:

- Focused LAST ⇒ focused es la última instancia escrita en el pick buffer ⇒ focused **gana** la zona de solapamiento.
- El neighbour (dibujado antes) es **sobreescrito** por focused en el overlap.

Resultado: el usuario hace click en un pin cercano a Apple, el pick devuelve Apple. No puede cambiar la selección.

### Por qué se nota especialmente en clusters tipo SF Bay

`entitySpread.ts` agrupa entidades a <50 km y las dispersa en un anillo de **200 km de radio** con hasta 6 posiciones (CAP del primer anillo). Distancia angular entre posiciones adyacentes en un anillo de 6: **200 km** (cuerda = 2·R·sin(30°)).

Picking radius dinámico (líneas 596–601): 24 screen-px × metersPerPx, clamped a `[30k, 120k]`. A zoom 1.5–2.8 el clamp superior siempre se activa ⇒ radius = **120 km**.

Dos picks adyacentes en el mismo anillo: 120 + 120 = 240 km, separación real 200 km ⇒ **solapamiento de 40 km**.

Sin el bug del ordering, el usuario podría clickar el neighbour en parte de su disco y aún ganar. Con el bug, todo el solapamiento de 40 km pertenece a focused.

### Otro síntoma relacionado: hit radius minúsculo a zoom bajo

A zoom inicial 1.5 lat 0: `metersPerPx ≈ 55 355 m/px`, `dynamicRadius` se clampa a 120 km ⇒ **2.2 screen-px** de área de hit. El dot visual (`globe-dots`, getRadius 30 km) son 0.5 screen-px. El tap target es demasiado pequeño, pero no es el bug que reporta el usuario.

### Fix propuesto

Invertir el orden — focused FIRST, neighbours después:

```ts
const orderedVisible = this._focusedId
  ? [
      // focused PRIMERO ⇒ se dibuja antes en el pick buffer
      // neighbours después ⇒ ganan el overlap, permitiendo cambiar de selección
      ...visibleEntities.filter((d: any) => d.nodeId === this._focusedId),
      ...visibleEntities.filter((d: any) => d.nodeId !== this._focusedId),
    ]
  : visibleEntities;
```

Costo: 1 línea efectiva. Sin cambios de contrato.

### Riesgos del fix

- El visual del focused (línea 741: fill `[0,229,255,80]`, stroke ancho 3) podría quedar TAPADO si un neighbour se solapa visualmente en el dot del focused. Mitigación: focused tiene su propio halo de 300 km (`globe-selected-halo`, no-pickable, decorativo) que se mantiene visible siempre.
- Si dos neighbours adyacentes también se solapan (40 km central entre dos no-focused), el ganador es el último de los dos en el array. Comportamiento idéntico al estado actual.

---

## Bug #2 — Arcs no salen del pin seleccionado

**Severidad:** Media. Visual / cosmético, pero rompe la metáfora de la red.
**Estado:** **CONFIRMADO** vía análisis estático del mapper + entitySpread.
**Coordenadas:** `src/services/companyNetworkMapper.ts` líneas 72, 108–109, 122–123 + `src/engine/GlobeBridge.ts` `CMD.SET_ARCS` handler (línea 423).

### Cadena de causación

1. Usuario click Apple ⇒ overlay abre ⇒ provider/client hooks resuelven ⇒ `mapCompanyNetworkToArcs` produce arcs.
2. El mapper usa coordenadas **reales** de `Company.longitude/latitude`:

```72:72:src/services/companyNetworkMapper.ts
  const sourceLL: [number, number] = [focalCompany.longitude, focalCompany.latitude];
```

```108:109:src/services/companyNetworkMapper.ts
      source:       [other.longitude, other.latitude],
      target:       sourceLL,
```

3. La ArcLayer renderiza `source/target` tal cual (líneas 679–680 de GlobeBridge).
4. **Pero el dot del foco se renderiza en `displayLng/displayLat`**, no en `longitude/latitude`. `entitySpread.computeDisplayPositions` desplaza a todas las entidades del cluster sobre un anillo de 200 km respecto al centroide.

Resultado: arc sale del centroide del cluster (las coords reales de Apple HQ), no del dot visible (que está a ~150 km en algún punto del anillo).

### Cómo se siente al usuario

- Si Apple está en SF Bay (Apple/Tesla/Google/Meta/Nvidia/Intel todos < 50 km entre sí) el cluster es de 6 ⇒ anillo completo. Apple HQ real ≈ (-122.03, 37.33). Apple display ≈ ~(-121, 38) o similar (depende del orden alfabético del id). El arc se ancla 150 km al sur del dot visible.
- Si Apple estuviese aislada (cluster size 1), `entitySpread` devuelve displayLat=latitude, displayLng=longitude, no hay drift, los arcs sí salen del dot.

### Fix propuesto

En `GlobeBridge.send` handler de `CMD.SET_ARCS`, resolver `sourceNodeId`/`targetNodeId` contra `_displayEntities` antes de almacenar:

```ts
case 'CMD.SET_ARCS': {
  const incoming = command.data.arcs;
  if (this._arcs.length === 0 && incoming.length === 0) break;

  // Bind arc endpoints to displayed positions for entities that exist in the
  // current entity set. For arcs to entities outside top30/top15persons (i.e.
  // not visible as dots), fall back to the mapper-provided real coords.
  const byNodeId = new Map<string, DisplayEntity>();
  for (const d of this._displayEntities) {
    const nid = (d as any).nodeId;
    if (nid) byNodeId.set(nid, d);
  }
  const resolved = incoming.map(a => {
    const s = byNodeId.get(a.sourceNodeId);
    const t = byNodeId.get(a.targetNodeId);
    return {
      ...a,
      source: s ? [s.displayLng, s.displayLat] as [number, number] : a.source,
      target: t ? [t.displayLng, t.displayLat] as [number, number] : a.target,
    };
  });
  this._arcs = resolved;
  this._arcsRevision++;
  this._redraw();
  break;
}
```

Coste: ~10 líneas en una función. Pure-function. Sin cambios de contrato.

### Riesgos del fix

- Si `_displayEntities` cambia (CMD.SET_ENTITIES) DESPUÉS de SET_ARCS, los arcs almacenados quedan congelados en las coords viejas. Mitigación A: revincular en SET_ENTITIES (`this._arcs = this._rebindArcs(this._arcs)`). Mitigación B: no rebind, dado que en el ciclo de vida actual SET_ENTITIES sólo se envía una vez por sesión (top30 al inicio). Para Sprint actual, Mitigación B es suficiente.
- Bug colateral conocido y NO resuelto: si el usuario selecciona a una persona (PERSON_NETWORK_RESOLVED), GoldOverlay envía arcs vacíos (línea 23 de GoldOverlay.tsx), por lo que este fix no aplica a personas. La red de personas no se visualiza hoy. Out of scope.

---

## Bug #3 — "Alguna propiedad css no actualizada"

**Severidad:** Cosmético.
**Estado:** **DIAGNÓSTICO INCOMPLETO** — el síntoma reportado por el usuario es vago. El audit muestra 3 archivos SCSS modificados respecto a HEAD, ninguno aparenta ser un regresión técnica:

### Modificados vs HEAD

| Archivo | Naturaleza | Diagnóstico |
|---|---|---|
| `src/features/gold-overlay/gold-overlay.scss` | **+57 líneas** | Añade 6 clases `.gov__conn-*` para una nueva fila de conexión. No-regresión. |
| `src/features/wall-street/modes/didacticView.module.scss` | **+39 líneas** | Añade `.layoutTabs` y `.layoutTab` para tabs nuevos. No-regresión. |
| `src/features/person-overlay/person-overlay.scss` | **−14 / +21 líneas** | Cambia `rgba(4,7,12,0.97)` → `rgb(4,7,12)` (fondo opaco), bordes 0.07 → 0.10, scrollbar oculto → scrollbar cyan thin. Subjetivo. |

### Hipótesis sobre lo que vio el usuario

1. **`person-overlay.scss`**: el `sr__center` ahora tiene fondo SÓLIDO en vez de translúcido (0.97). Si la metáfora de "panel translúcido sobre el globo" era intencional, esto rompe la sensación. Probable.
2. **Bug del overlay panel**: cuando aplicamos el fix de pointer-events en `CompanyOverlayHost.tsx` (rondas anteriores) marcamos los 4 `OverlayPanel` envoltorios con `pointer-events: none`. Si algún hijo concreto no quedó marcado con `auto`, puede haber un sub-componente "frío" al click. La auditoría rápida muestra que sólo se rescató `SecondPanel.tsx`. Otros (HeaderPanel, ThirdPanel, FourthPanel) no fueron revisados.
3. **`backdrop-filter` en tooltip**: deck.gl tooltip define `backdropFilter: blur(8px)` (línea 271–272). En navegadores con dev-tools abierto y composición acelerada inactiva, el blur se ignora y se ve sólido. No es un regresión nuestra.

### Acción sugerida

Necesito que el usuario indique la pantalla / componente concreto. Sin eso, el audit visual termina aquí. Lo que SÍ puedo hacer:

- **Listar los hijos de `CompanyOverlayHost` que NO se revisaron** y verificar que cada uno tiene `pointer-events: auto` en su raíz.
- **Revertir el cambio de `sr__center`** a translúcido si la metáfora original era intencional.

---

## Orden de fix sugerido (por costo / impacto)

1. **Bug #1 — picking** (1 línea, alto impacto funcional, sin riesgo de contrato).
2. **Bug #2 — arcs** (~10 líneas, impacto visual claro, sin contrato afectado).
3. **Bug #3 — CSS** (requiere síntoma concreto para no sobre-tocar).

Antes de tocar nada, leer este doc y validar las hipótesis. Los fixes de #1 y #2 son patches quirúrgicos sobre coordenadas exactas y los pasaré como diffs aislados si la auditoría se acepta.

---

## Anexo — Coordenadas exactas para los fixes

```ts
// Fix #1
// src/engine/GlobeBridge.ts — sustituir líneas 603-611
// Invertir orden de orderedVisible: focused FIRST, neighbours después.

// Fix #2
// src/engine/GlobeBridge.ts — sustituir líneas 423-432 (case 'CMD.SET_ARCS')
// Resolver sourceNodeId/targetNodeId contra _displayEntities.
// Fallback a coords del contrato cuando el nodeId no está en el entity set.
```
