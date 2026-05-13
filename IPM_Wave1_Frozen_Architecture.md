# Meridian / IPM — Wave 1 Frozen Architecture

**Estado:** FROZEN al 2026-05-09
**Propósito:** Constitutional artifact. Cargar al inicio de cualquier chat nuevo para retomar contexto.

---

## Doctrina canónica (4 pilares)

> Postgres remembers what is true. (`core`)
> Agents remember what they did. (`agent`)
> Governance decides what is allowed. (`governance`)
> AI remembers what it is thinking. (`ai`, futuro Ola 2)

Cada pilar tiene su schema dedicado. El core nunca se contamina con concerns de otros pilares.

---

## Schemas finales

| Schema | Status | Tablas | Responsabilidad |
|---|---|---|---|
| `core` | **FROZEN Ola 1A** | 3 | Pure ontology + minimal origin trace |
| `agent` | **FROZEN Ola 1B** | 2 | Identity + execution attribution |
| `governance` | **FROZEN Ola 1B** | 4 | Contracts + audit + violations |
| `ai` | Ola 2 | TBD | Runtime cognition + learning |
| `policy` | Ola 1B late / Ola 2 | TBD | OPA runtime enforcement |
| `surface` | Ola 3 | TBD | MCP + external exposure |
| `ops` | Ola 2/3 | TBD | Operations metadata |
| `assurance` | Ola 4+ | TBD | TEE/zkML placeholder |

---

## Archivos producidos en Ola 1 (FROZEN)

### `01_core.sql` — 435 líneas
3 tablas: `Entity`, `RelationEdge`, `RelationEvidence`.

**Constraints críticos:**
- `EX_Edge_NoOverlap` (GiST EXCLUDE bitemporal)
- `CK_Edge_ValidRange` (ValidTo > ValidFrom)
- `CK_Edge_VerificationCoherence` (VerifiedBy/At ↔ TruthState=verified)
- `CK_Entity_NodeTypeMatch` (split_part(NodeId,':',1) = EntityType)
- `CK_Entity_SlugFormat` (ASCII)
- `CK_Entity_NodeIdFormat` (type:slug ASCII)
- `CK_Entity_DeletedCoherence` + `CK_Edge_DeletedCoherence`
- `CK_Entity_LegacyMappingsShape` (jsonb_typeof = 'object')

**Generated columns:**
- `CanonicalNodeKey` = 'entity:' || NodeId (protocol-agnostic, backend prepende prefix)
- `IsCurrent` = (ValidTo IS NULL) — open-ended marker, NOT "valid now"
- `SystemPeriod` = tstzrange(ValidFrom, ValidTo, '[)')

**Triggers:**
- `trg_Entity_set_updated_at` (BEFORE UPDATE → core.fn_set_updated_at)
- `trg_RelationEdge_set_updated_at` (idem)

### `02_agent.sql` — 143 líneas
2 tablas: `AgentActor`, `AgentActionLedger`.

**Decisiones doctrinales:**
- AgentActor en `agent` (NO en core — core es identity, no cognition)
- AgentProfile (calibration, runtime config) NO está acá — va a `ai` Ola 2
- AffectedEntities/AffectedEdges como JSONB envelope explícito: `[{"entityId":"uuid","action":"promoted|created|modified|deleted|read"}, ...]`
- Loose coupling al core via referencia textual de ActorSlug, sin FK cross-schema

### `03_governance.sql` — 388 líneas
4 tablas: `CognitiveContract`, `CognitiveContractViolation`, `EntityChangeLog`, `RelationEdgeChangeLog`.

**Functions:**
- `governance.fn_audit_change()` — single reusable audit trigger function (detecta TG_OP + TG_TABLE_NAME)
- `governance.fn_check_cognitive_contract()` — enforcement reads from agent.AgentActor cross-schema

**Triggers físicos en core:**
- `trg_Entity_audit` (AFTER INSERT/UPDATE/DELETE → fn_audit_change)
- `trg_RelationEdge_audit` (idem)
- `trg_RelationEdge_cognitive_contract` (BEFORE INSERT/UPDATE → fn_check_cognitive_contract — ONLY RelationEdge, NO Entity)

### `MeridianAuditInterceptor.cs` — 429 líneas
EF Core SaveChangesInterceptor.

**Decisiones doctrinales:**
- Detection by property presence (FindProperty), NOT table name
- DB owns UpdatedAt (BEFORE UPDATE trigger) — C# no toca
- BatchId immutable origin — nunca overwritten en UPDATE
- Null-guard: nunca clobberea attribution previa
- Anti-spoofing trust hierarchy: JWT claim agent_slug > matching header > authenticated user + header > reject
- Whitelist de agent slugs validation = upstream middleware, NO acá (no DB round-trip per SaveChanges)
- Respeta valores explícitos en INSERT y UPDATE (seed scripts no se sobrescriben)

---

## 16 decisiones doctrinales (locked)

1. Thin core. Nunca extender más allá de minimal origin trace.
2. CanonicalNodeKey (NO McpUri/CanonicalUri) — protocol-agnostic generated column.
3. ASCII-only NodeId. UTF-8 lives en CanonicalName.
4. AgentActionLedger usa JSONB envelope shape explícito.
5. CognitiveContract abstract en `governance` schema (movido de core).
6. Cognitive contract trigger ONLY en RelationEdge (NO en Entity — high-impact mutations only).
7. Single reusable audit trigger function, NO 6 triggers separados.
8. Bitemporal GiST EXCLUDE en Ola 1 (NO Ola 2).
9. NO IF NOT EXISTS en schema (fail-fast canonical), pero SÍ en extensions (portability).
10. PolicyDecisionSample sampleado 5% retention 90 días, PolicyViolation siempre durable.
11. Per-brain isolation Graphiti graphs (Ola 4 deferred).
12. Estados explícitos: proposed/validated/promoted/rejected/stale (Graphiti memory divergence prevention).
13. Cognee downgrade Ola 3 (NO eliminado, complementario a Graphiti).
14. Neo4j Community para Graphiti (NO FalkorDB inicialmente).
15. AgentLedger movido de `core` a `agent` schema (provenance forensic).
16. CreatedBy/CreatedByAgent pueden coexistir (agent acting on behalf of user).

---

## VerificationStatus semantics (resolved)

Trust lifecycle de canonical admission, **NO** existencia metafísica:

| Status | Significado |
|---|---|
| `seed` | Curated trusted ingestion (manual o seed dataset) |
| `proposed` | Agent-suggested pending review |
| `verified` | Human-confirmed |
| `disputed` | Source contradiction, under review |

Apple existe en el mundo independiente de este campo. El campo trackea: ¿esta entity fue admitida al canonical truth layer?

---

## Invariants (NUNCA violar)

1. NEVER suggest microservices/Kafka/Kubernetes prematuramente
2. NEVER suggest Microsoft Agent Framework (Python-first decision)
3. NEVER mix canonical truth con cognitive working memory
4. NEVER propose shared Graphiti graph entre brains
5. NEVER suggest McpUri (use CanonicalNodeKey)
6. NEVER suggest tokens/crypto/blockchain
7. NEVER suggest Augur, Mapbox, D3, cytoscape, Pinecone, Weaviate, FalkorDB inicialmente
8. NEVER suggest Drools/Camunda DMN (use OPA + Rego)
9. ALWAYS preserve PascalCase quoted identifiers
10. ALWAYS preserve triple temporality (ValidFrom/ValidTo/AsObservedAt/LastSeenAt)
11. ALWAYS apply 5 preguntas filtro antes de agregar tablas
12. NEVER extend `core` beyond minimal origin trace
13. ASCII-only NodeId convention

---

## MCP resolution (verified web_search 2026-05-09)

Microsoft SDK v1.0 estable desde marzo 2026:
- `ModelContextProtocol`
- `ModelContextProtocol.AspNetCore`

**Resuelve:** Tools `[McpServerTool]`, Prompts `[McpServerPrompt]`, capability negotiation, Streamable HTTP transport, OAuth 2.1.

**NO resuelve (necesita schema propio):**
- URI canónica → `core.Entity.CanonicalNodeKey` ✅
- Exposure rules per tier → `surface.ExposureRule` (Ola 3)
- Access logging → `surface.AccessLog` (Ola 3)
- Tool catalog versioned → `surface.ToolDefinition` (Ola 3)
- Resource templates → `surface.ResourceTemplate` (Ola 3)

---

## Tech stack confirmado

- PostgreSQL 16 + pgvector + btree_gist (canonical)
- ASP.NET Core 8 + EF Core 8 (~230 endpoints)
- Python FastAPI sidecar port 8001
- React 19 + DeckGL (frontend v2)
- n8n (Docker, autoresearch)
- OpenClaw (local agent runtime)
- MCP C# SDK v1.0 (ModelContextProtocol.AspNetCore)
- OPA + Rego (Ola 2-3)
- Phoenix + OpenTelemetry (Ola 1, parallel)
- DeepEval (Ola 1, CI/CD)
- Pydantic AI + AgentSpec (Ola 1)
- OpenLineage + Marquez (Ola 2)
- Cognee (Ola 4, multimodal — Hermes brain)
- Neo4j Community + Graphiti (Ola 4, temporal cognitive memory — Cassandra brain)
- DSPy (Ola 3, Brier compilation target)
- vLLM + LMCache (Ola 3)
- Inspect AI UK AISI (Ola 4+)

---

## Atlas brains (10)

Atlas (orchestrator), Memo (memory curator), Argus (event watcher), Helios (energy/inflation), Nomos (structural scoring), Cassandra (precedent search — Graphiti user), Hermes (market translation — Cognee user), Aegis (risk gate), Janus (evaluation), Bolansky (signal synthesis).

---

## Container info

- Container: `ipm_sql` (pgvector/pgvector:pg16)
- Port: 5432
- Network: `ipm-network`
- Backend container: `ipm-backend-container` port 32769

---

## Estado de datos en producción

- 540 persons
- 248 companies
- 171 countries
- 1294 RelationEdges
- 121 tablas en schema `public` (legacy, a migrar al canonical multi-schema)

**Migración pendiente:** `public.*` → `core.Entity` + `profiles.*` via INSERT...SELECT con deduplicación.

---

## Lo que NO está en Ola 1 (deferred a olas siguientes)

**Ola 2:**
- `ai.AgentProfile` (calibration scores, runtime config)
- `ai.PredictionLog` (hash chain — gap #75)
- `ai.EntityNeed` + `ai.ContextRequest` (DDC — gaps #35, #36)
- `core.RelationEvidence.WikiChunkRef` (gap #12, FK lazy)
- `projectops.SchemaVersion` view (gap #79)
- `policy.*` schema completo (PolicyVersion, PolicyDecisionSample, PolicyViolation)

**Ola 3:**
- Schema `surface` completo (5 tablas)
- MCP wiring backend C# (Microsoft SDK)
- Multi-tenant RLS (gap #66)

**Ola 4:**
- LastReadAt context decay (gap #41 deferred)
- Graphiti + Neo4j Community en `ai` schema
- `ai.GraphitiEpisode`
- `core.RelationEvidence.SourceEpisodeId` ya está en core preparado

---

## Cómo cargar este contexto en chat nuevo

1. Pegar este archivo completo al inicio
2. O cargar las skills relevantes: `vision-global`, `ipm-project-state`, `ipm-architecture`, `ipm-context-pack`, `ipm-database`
3. Avisar: "Estamos al final de Ola 1 frozen. Próximo paso: [lo que sigue]"

---

## Total Ola 1

| Archivo | Líneas |
|---|---|
| 01_core.sql | 435 |
| 02_agent.sql | 143 |
| 03_governance.sql | 388 |
| MeridianAuditInterceptor.cs | 429 |
| **Total** | **1395 líneas** |

Listo para producción. Bootstrap fail-fast en schemas, tolerante en extensiones. Todos los invariantes de coherencia enforced en DB.
