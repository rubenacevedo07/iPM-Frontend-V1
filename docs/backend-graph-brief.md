# Brief para el agente del backend — Graph / Relations endpoints

> **Cómo usar este documento:** abrir Claude Code en el repo de backend (`iPM_API` o equivalente) y pegar el contenido completo. El agente debe responder a las **3 preguntas de la sección 3** y validar/implementar los **3 endpoints de la sección 4**. Las secciones 1 y 2 son contexto.

---

## 1. Contexto

El frontend `IPM_Frontend_V1` tiene una vista de grafo (`src/features/graph-view/`) construida sobre `@xyflow/react` con layout orbital. Hoy renderiza datos mock (~10 nodos), pero ya tenemos los contratos de dominio definidos y consumiendo el endpoint de **1-hop neighbors**.

El objetivo de Sprint 2 es subir esta vista al nivel de [Cambridge Intelligence (KeyLines/ReGraph)](https://cambridge-intelligence.com/): grafos interactivos de cientos a miles de nodos con expand/collapse multi-hop, time-bar, filtros server-side, y análisis (centrality, shortest path, communities).

Para llegar ahí el frontend va a hacer 4 cambios (no requieren backend):
- A) adapter en `src/features/graph-view/adapters.ts` para mapear `NeighborsResponse` → shapes de @xyflow/react
- B) reemplazar mocks por `useQuery(qk.personNeighbors(...))` ya existente
- C) implementar `calculateForce()` real (d3-force) en el `graphLayoutEngine.ts`
- D) renderer dual: @xyflow/react para "studio" (≤200 nodos) + deck.gl `GraphLayer` para "macro" (≥1k nodos)

**Lo que sí necesitamos del backend** son las 3 cosas de la sección 4. Antes de eso, contestá las 3 preguntas de la sección 3 para que sepamos qué tenemos hoy.

---

## 2. Estado actual del contrato (lo que el frontend ya espera)

### 2.1 Tipos de dominio (frontend → `src/domain/types.ts`)

```ts
// Nodo del grafo
interface NeighborNode {
  nodeId:         string                // formato canónico: "person:7", "company:42", "country:US"
  name:           string
  type:           NodeType              // 'PERSON' | 'COMPANY' | 'COUNTRY' | ...
  compositeScore: number | null         // 0–100, score interno del nodo
}

// Arista del grafo
interface NeighborEdge {
  sourceNodeId: string
  targetNodeId: string
  edgeType:     string                  // 'INVESTOR' | 'CEO_OF' | 'ALLIED_WITH' | ...
  strength:     RelationStrength        // 'Critical' | 'High' | 'Medium' | 'Low'
}

// Respuesta del endpoint
interface NeighborsResponse {
  centralNodeId: string
  nodes:         NeighborNode[]
  edges:         NeighborEdge[]
}

// Análisis de relación 1↔1
interface RelationAnalysis {
  sourceEntity:  string
  targetEntity:  string
  relationType:  RelationType
  strength:      number                 // 0–100
  riskScore:     number                 // 0–100
  description:   string | null
  powerDynamic:  string | null
  keyLevers:     string[]
  riskFactors:   string[]
}

// Edge enriquecido (DTO específico — `src/types/relationEdge.ts`)
interface RelationEdgeDto {
  id:           number
  sourceType:   string;  sourceId: number;  sourceName: string
  targetType:   string;  targetId: number;  targetName: string
  edgeType:     string
  strength:     'Critical' | 'High' | 'Medium' | 'Low'
  label:        string | null
  description:  string | null
  value:        number  | null
  isVerified:   boolean
  validFrom:    string  | null   // ISO date
  validTo:      string  | null   // ISO date
  lastSeenAt:   string  | null   // ISO date
  createdAt:    string
  updatedAt:    string
}
```

### 2.2 Endpoints que el frontend consume hoy (`src/domain/queries.ts`)

| Fetcher                              | URL                                                                          | Devuelve              |
|--------------------------------------|------------------------------------------------------------------------------|-----------------------|
| `personNeighbors(nodeId)`            | `GET /graph/node/{nodeId}/neighbors`                                         | `NeighborsResponse`   |
| `companyNeighbors(nodeId)`           | `GET /graph/node/{nodeId}/neighbors`                                         | `NeighborsResponse`   |
| `relation(sourceNodeId, targetId)`   | `GET /relations/analyze?source={src}&target={tgt}`                           | `RelationAnalysis`    |
| `relationArcs(limit)`                | `GET /graph/edges/top?limit={n}`                                             | `RelationArcDto[]`    |
| `entityNews(nodeId, limit)`          | `GET /news/entity/{nodeId}?limit={n}`                                        | `Signal[]`            |

---

## 3. Preguntas — necesito que confirmes antes de implementar nada

### Pregunta 1 — `/graph/node/{nodeId}/neighbors`

1. ¿Qué profundidad devuelve? ¿Solo 1-hop (vecinos directos) o multi-hop?
2. ¿Hay un límite de nodos/edges en la respuesta? Si sí, ¿cuál y dónde se configura?
3. ¿El campo `compositeScore` en `NeighborNode` está poblado siempre, o solo para personas/empresas? ¿Está normalizado 0–100 o es score crudo?
4. ¿Qué valores reales de `edgeType` devuelve el backend hoy? Necesito el enum/lista exacta para pintar leyenda y filtros.
5. ¿La función de cálculo de `strength` (`Critical`/`High`/`Medium`/`Low`) se basa en qué? ¿Hay un score numérico subyacente que podríamos exponer en el DTO?

### Pregunta 2 — temporalidad de las relaciones

1. ¿`RelationEdgeDto.validFrom` / `validTo` están realmente poblados en producción, o solo `createdAt` / `updatedAt`?
2. Si sólo está `createdAt`: ¿qué representa? ¿Cuándo se descubrió la relación o cuándo empezó realmente?
3. ¿Hay manera de saber si una relación está **activa hoy** vs **histórica**? (esto bloquea la time-bar)
4. ¿Existe `lastSeenAt` o equivalente para relaciones que se siguen renovando (artículos de prensa repetidos, etc.)?

### Pregunta 3 — capacidad para BFS server-side

1. ¿Qué motor de grafos usa el backend? (Neo4j, Postgres con `WITH RECURSIVE`, in-memory custom, otro)
2. ¿Es viable expresar BFS limitado por `depth ≤ 3` y `limit ≤ 1000` con buen rendimiento? ¿Tiempo aproximado para una persona muy conectada (ej. Musk) con depth=2?
3. ¿Se puede filtrar la travesía por `edgeType` y `minStrength` antes de devolver, en vez de en cliente?
4. ¿Hay índices sobre `(sourceNodeId, edgeType)` y `(targetNodeId, edgeType)`?

---

## 4. Endpoints nuevos requeridos (en orden de prioridad)

### 4.1 — **`GET /graph/subgraph`** (PRIORIDAD ALTA — bloquea expand/collapse y macro view)

**Contrato propuesto:**

```http
GET /graph/subgraph
  ?center={nodeId}               // requerido: "person:7" | "company:42" | ...
  &depth={1..3}                  // opcional, default 1
  &limit={1..1000}               // opcional, default 200 (corta BFS por nodos totales)
  &edgeTypes[]={INVESTOR,CEO_OF} // opcional, lista repetida o CSV
  &minStrength={Low|Medium|High|Critical}  // opcional, default 'Low'
  &nodeTypes[]={PERSON,COMPANY}  // opcional, lista repetida
  &since={ISO-date}              // opcional: solo edges con validFrom >= since
```

**Respuesta:** `NeighborsResponse` extendido con `depth` por edge para que el cliente pueda renderizar "rings" concéntricos:

```ts
interface SubgraphResponse {
  centralNodeId: string
  nodes: Array<NeighborNode & { depth: number }>  // depth=0 es el central
  edges: Array<NeighborEdge & { depth: number }>  // depth de la arista = max(depth(src), depth(tgt))
  truncated: boolean              // true si BFS se cortó por limit
  totalReachable: number | null   // si es barato calcularlo
}
```

**Casos de uso:**
- **depth=1 + limit=50:** ego graph del studio relation (igual que hoy)
- **depth=2 + limit=300:** macro view del network panel
- **depth=3 + limit=1000:** análisis profundo (background job, opcional)

**Comportamiento esperado:**
- BFS, NO DFS (depth-first puede sesgar).
- Expansión hasta agotar `limit` priorizando aristas de mayor `strength`.
- Si `limit` se agota antes de cubrir todos los `depth=N`, marcar `truncated: true`.

---

### 4.2 — **`GET /graph/path`** (PRIORIDAD MEDIA — feature signature de Cambridge Intelligence)

**Contrato propuesto:**

```http
GET /graph/path
  ?source={nodeId}
  &target={nodeId}
  &maxDepth={1..6}     // default 4
  &edgeTypes[]=...     // opcional
  &minStrength=...     // opcional
```

**Respuesta:**

```ts
interface PathResponse {
  found: boolean
  hops: number                   // null si !found
  paths: Array<{                 // hasta 3 paths más cortos
    nodes: NeighborNode[]        // ordenados source → target
    edges: NeighborEdge[]
    totalStrength: number        // suma de strengths numéricas
  }>
}
```

**Para qué:** "¿Cómo conecta Musk con Putin?" — UX killer para análisis de inteligencia.

---

### 4.3 — **Filtros en `/graph/edges/top`** (PRIORIDAD ALTA — actualmente filtra cliente y no escala)

Hoy: `GET /graph/edges/top?limit=60` devuelve top 60 edges.

**Cambio pedido:**

```http
GET /graph/edges/top
  ?limit=60
  &edgeTypes[]=INVESTOR,CEO_OF
  &minStrength=High
  &since=2025-01-01            // opcional: solo edges con validFrom/lastSeenAt >= since
  &nodeTypes[]=PERSON,COMPANY
```

**Por qué:** la dashboard pinta arcos en el globo y rompe en cliente cuando el conjunto crece. El filtrado debe ser server-side.

---

## 5. Cómo respondernos

Idealmente, en este mismo documento:

1. Sección "Respuestas a las 3 preguntas" — un párrafo por sub-pregunta
2. Sección "Endpoints — estado": para cada uno de los 3 nuevos:
   - ✅ implementable como está descrito
   - ⚠️ implementable con cambios (especificar cuáles)
   - ❌ no implementable hoy (especificar qué falta: índices, motor, datos)
3. Sección "Estimación": rough hours / días por endpoint
4. Sección "Cambios al contrato existente": si hay algún campo que no podés poblar o que renombrarías, decilo aquí — el frontend lo absorbe en el adapter sin cambios en componentes.

Si necesitás aclaraciones o ejemplos de payloads, preguntá libremente. El frontend ya está listo para consumir cualquier shape `NeighborsResponse`-compatible vía adapters.
