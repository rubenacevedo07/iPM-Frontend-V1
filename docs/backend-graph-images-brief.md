# Brief #2 — Backend: contract gap en `/graph/node/{id}/neighbors` + imágenes de entidades

> **Cómo usarlo:** copiar y pegar este documento en Claude Code del repo backend (`iPM_API` o equivalente). Es complementario al brief previo `docs/backend-graph-brief.md` (3 endpoints nuevos + subgraph). Este es **más urgente** porque el endpoint que YA EXISTE (`/graph/node/{nodeId}/neighbors`) tiene un contract mismatch que impide al frontend renderizar el grafo correctamente.

---

## 1. Lo que descubrimos en vivo

Hicimos `curl http://localhost:5180/api/graph/node/person%3A7/neighbors` (Musk) y el backend devolvió esto:

```json
[
  {
    "id":       "company:7",
    "entityId": 7,
    "type":     "Company",
    "label":    "Tesla",
    "lat":      30.22083,
    "lng":      -97.65167,
    "dbId":     null,
    "name":     null,
    "nodeId":   null,
    "slug":     null,
    "subtitle": null,
    "photoUrl": null,
    "score":    null
  },
  { "id": "country:1", "entityId": 1, "type": "Country", "label": "United States", ... },
  { "id": "party:1",   "entityId": 1, "type": "PoliticalParty", "label": "IND", ... }
]
```

**3 problemas críticos** detectados:

### Problema A — Shape: respuesta es `T[]`, no envelope

El frontend (V1) declara el contract como:

```ts
interface NeighborsResponse {
  centralNodeId: string
  nodes:         NeighborNode[]   // [{ nodeId, name, type, compositeScore }]
  edges:         NeighborEdge[]   // [{ sourceNodeId, targetNodeId, edgeType, strength }]
}
```

Pero el backend devuelve un **array plano de nodos** sin envoltura ni edges. Tuvimos que parchar con un adapter defensivo que detecta el shape array y lo coerciona en frontend (`src/features/graph-view/adapters.ts` → `coerceLegacyShape`). Eso ya está en producción pero es tech debt.

### Problema B — No hay edges en la respuesta

El endpoint `/graph/node/{nodeId}/neighbors` debería devolver tanto los nodos vecinos COMO las aristas que los conectan (al menos las que conectan al `centralNodeId`). Sin edges, el grafo se ve como 3 nodos flotando sin relaciones — irrenderizable como red.

### Problema C — Casi todos los campos están en `null`

`name`, `dbId`, `nodeId`, `slug`, `subtitle`, `photoUrl`, `score` — todos null. Solo `id`, `entityId`, `type`, `label`, `lat`, `lng` vienen poblados. El frontend necesita `name` (lo usa como display + lookup de imágenes), `score` (badge en el nodo), y crucialmente **`photoUrl`** (avatar visual).

---

## 2. Asks (orden de prioridad)

### Ask 1 — **`photoUrl` poblado por entidad** (PRIORIDAD ALTA, mayor impacto visual)

Hoy `photoUrl` está siempre `null` en la respuesta, aunque el DTO ya tiene el field. Frontend está parcheando con una **lookup table** local (`src/types/_ext/entityImages.ts`) que mapea nombre → ruta en `/public/persons/*` y `/public/logos/*`. Pero eso es frágil: requiere mantener la tabla sincronizada con nombres del backend, no escala, y los assets no están versionados.

**Solución pedida:**
- Cada `Person` y `Company` en DB tiene (o debería tener) un campo `PhotoUrl` / `LogoUrl` / `ImageUrl`.
- Si lo tenés en DB → simplemente pasarlo en la respuesta de `/neighbors`.
- Si NO existe el field → agregar columna `photo_url TEXT NULL` a `person` y `company` con migration. Inicialmente nullable, se backfilea offline (Claude / scraping / manual).

**Decisión de hosting (cualquiera está bien, decir cuál):**

| Opción | Pros | Contras |
|---|---|---|
| **a) Path relativo** (`/persons/Musk.jpeg`) | Frontend sirve los assets desde `public/`. Hoy hay ~50 personas + 250 logos ya disponibles ahí. Sin tráfico extra al backend. | Assets no versionados, deploy frontend depende de tenerlos. |
| **b) URL absoluta** (`https://cdn.ipm.io/persons/musk-7.jpg`) | Asset hosting externo (S3, CDN). Backend solo guarda URL. | Requiere infra de hosting. |
| **c) Path en backend** (`/api/files/person/7.jpg`) | Backend sirve los binarios. Single source of truth. | Backend gana endpoint extra de archivos estáticos. |

**Recomendación frontend:** opción **(a)** porque ya tenés los assets, mínimo cambio. Backend solo guarda el path string.

### Ask 2 — **Fix shape de `/neighbors`** (envelope + edges)

Cambiar la respuesta de `T[]` a:

```ts
interface NeighborsResponse {
  centralNodeId: string           // el nodeId del subject (e.g. "person:7")
  nodes: Array<{
    nodeId:         string         // "company:7" — no null
    name:           string         // "Tesla" (currently in 'label')
    type:           NodeType       // 'PERSON' | 'COMPANY' | 'COUNTRY' | 'PARTY' | ...
    compositeScore: number | null  // 0–100 si existe
    photoUrl:       string | null  // /persons/Musk.jpeg | https://... | null
    latitude:       number | null  // mover desde 'lat'
    longitude:      number | null  // mover desde 'lng'
  }>
  edges: Array<{
    sourceNodeId: string           // "person:7"
    targetNodeId: string           // "company:7"
    edgeType:     string           // 'Owns', 'CEO_OF', 'Partners', 'Supplies', ... (uno de los 16 declarados)
    strength:     'Critical' | 'High' | 'Medium' | 'Low'
  }>
}
```

**Detalles:**
- `centralNodeId` es necesario porque el frontend lo usa para identificar el centro del subgraph.
- `nodes[].name` debe estar poblado (hoy solo `label` viene poblado — pueden ser el mismo valor, pero el field se llama `name`).
- `nodes[].type` debe normalizarse a la lista de `NodeType` del frontend. Hoy llega `"Company"` pero el frontend espera `"COMPANY"` (uppercase). Pueden negociar el casing, frontend hoy hace `.toLowerCase()` para matchear.
- `edges` son la pieza crítica que falta. Sin ellas no hay grafo.

### Ask 3 — Poblar los demás `null` (nice-to-have)

`dbId`, `slug`, `subtitle`, `score` están en el DTO pero todos null. Si son útiles populalos; si no, removelos del DTO para no confundir al frontend.

---

## 3. Estado del schema según lo que sabemos del DB

Del análisis previo (brief #1, sección "Diagnóstico"):
- Tabla `Person` existe con campos como `Name`, `LastName`, `Title`, `Photo` (campo `photo` que devolvía paths en `PersonPowerIndex.person`).
- Tabla `Company` debería tener algo similar (`Logo` o `ImageUrl`).
- La vista `GraphNode` probablemente NO está joineando con esos campos cuando construye `GraphNodeDto`.

**Acción concreta:** revisar la query que construye la respuesta de `/graph/node/{id}/neighbors` (probablemente en `GraphService.GetNeighborsAsync` que ya investigamos en el brief #1, ~línea 90-107). Agregar joins a `Person.Photo` y `Company.Logo` (o equivalentes) y mapear al field `photoUrl`.

---

## 4. Cómo respondernos

Idealmente en este mismo documento, agregando 4 secciones:

1. **Estado actual de `photoUrl` en DB**: ¿el field existe? ¿está poblado para personas/empresas?
2. **Cambios de DTO viables**: el shape envelope propuesto (Ask 2) — ✅ implementable / ⚠️ con cambios / ❌ requiere migration de schema
3. **Cambios de query**: qué tabla joinear y cuánto cuesta calcular edges en BFS de 1-hop
4. **Estimación**: horas/días por Ask. El más simple (Ask 1 si el field ya existe) debería ser <2h. Ask 2 con edges es ~4-6h porque hay que agregar lógica de query.

Si necesitás aclaraciones, preguntá libremente. El frontend ya tiene el adapter defensivo (`coerceLegacyShape`) listo para absorber cualquier shape mientras se hace la transición.

---

## 5. Bonus — endpoint que tampoco existe pero querríamos

Después de resolver Ask 1+2, el siguiente paso natural es el endpoint `/graph/subgraph?center=X&depth=N&limit=L` descrito en `docs/backend-graph-brief.md` sección 4.1. Eso desbloquea expand/collapse multi-hop y la macro-view de grafo.

Por ahora el ego-graph 1-hop bien implementado (Ask 2) cubre el 80% del valor.
