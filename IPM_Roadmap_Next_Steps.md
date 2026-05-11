# Meridian / IPM — Roadmap Wave 2-4

**Estado al 2026-05-09:** Wave 1 FROZEN. Listo para empezar Wave 2.

---

## Principio de gating

Cada componente tiene **trigger concreto de activación**. No se construye antes del trigger. Esto previene over-engineering y respeta la doctrina anti-scope-creep.

---

## Wave 2 — AI Cognition + Policy Runtime

**Activador:** Wave 1 ejecutado en `ipm_sql` greenfield. Schemas `core`, `agent`, `governance` operativos. Interceptor C# integrado en backend. Datos del schema `public` legacy migrados al canonical (al menos 248 companies + 540 persons como prueba).

**Días estimados:** 30-75 desde Wave 1 deploy.

### Archivo `04_ai.sql`

**Tablas:**
- `ai.AgentProfile` — runtime config + calibration score por agente. FK a agent.AgentActor.
- `ai.PredictionLog` — hash chain forensic, sealed predictions, Brier scoring.
- `ai.EntityNeed` — Karpathy DDC need detection.
- `ai.ContextRequest` + `ai.ContextRequestEntity` (m:m) — DDC context retrieval.

**Trigger de activación específico por tabla:**
- AgentProfile → cuando hay 2+ agents activos en agent.AgentActor (Atlas + uno más)
- PredictionLog → cuando primer agente genera primera predicción real (no antes)
- EntityNeed/ContextRequest → cuando autoresearch loop necesita disambiguation

### Archivo `05_policy.sql`

**Tablas:**
- `policy.PolicyVersion` — Rego policies versionadas
- `policy.PolicyDecisionSample` — 5% sampling, retention 90 días
- `policy.PolicyViolation` — siempre durable
- `policy.PolicyAttachment` — routing de policies a entities/edges

**Trigger de activación:** cuando se necesita enforcement runtime más allá de DB triggers (ej: validar contra modelo entrenado, no solo CHECK constraint).

**Decisión doctrinal:** OPA NO en Wave 1A, NO en Wave 1B inmediato. Solo cuando el caso requiera lógica que no se puede expresar en triggers DB.

### Archivo `06_projectops_schema_version.sql`

**Tablas:**
- `projectops.SchemaVersion` view materializada o vista normal — schema introspection visible to agents

**Trigger:** cuando primer agente externo conecta vía MCP y necesita saber qué schema versions están activas.

### C# accompaniment

- OPA middleware en ASP.NET para enforcement runtime
- Mapping entre `governance.CognitiveContract` rows y Rego policies activas
- Logging de violations a `governance.CognitiveContractViolation` y `policy.PolicyViolation`

---

## Wave 3 — Surface / Federation

**Activador:** primer cliente externo (humano o agente) requiere acceso programático al sistema. Sin ese cliente real, surface schema NO se construye.

**Días estimados:** 75-150 desde Wave 1 deploy.

### Archivo `07_surface_canonical_uri.sql` (mínimo)

Si todavía no se necesitan exposure rules pero sí MCP básico:
- Solo agregar índices o views sobre `core.Entity.CanonicalNodeKey` ya existente
- NO crear tablas surface todavía

### Archivo `08_surface.sql` (completo)

**Tablas:**
- `surface.ExposureRule` — qué entities ve cada tier OAuth
- `surface.AccessLog` — billing/compliance de MCP queries
- `surface.ToolDefinition` — tool catalog versioned
- `surface.ResourceTemplate` — URI patterns como `meridian:entity:{type}:{slug}`

**Trigger:** Microsoft SDK MCP wiring en backend C# alcanzó estado de servir resources/tools a 2+ clientes externos.

### MCP wiring C#

- `[McpServerTool]` decorators en endpoints
- `[McpServerPrompt]` para prompts compartidos
- `WithStreamableHttpServerTransport()`
- OAuth 2.1 integration con tier policies

### Multi-tenant RLS

**Trigger:** segundo cliente real requiere isolation. NO antes.

- `core.Entity.TenantId uuid NULL`
- RLS policies en `core.Entity` y `core.RelationEdge`
- Backend setea `app.current_tenant` en cada request

---

## Wave 4 — Cognitive Working Memory

**Activador:** Cassandra brain o equivalente necesita procesar streams temporales de news con contradictions. Sin caso de uso real, Graphiti no se instala.

**Días estimados:** 150+ desde Wave 1 deploy.

### Componentes

**Neo4j Community Edition:**
- Sidecar Docker container
- Per-brain isolation (cada brain con su graph propio)

**Graphiti:**
- Python service que escribe a Neo4j
- Estados explícitos: proposed/validated/promoted/rejected/stale (memory divergence prevention)

**Schema additions:**
- `ai.GraphitiEpisode` — link a sesiones de ingestion
- `core.RelationEvidence.SourceEpisodeId` ya está preparado (substrate-agnostic comment)

### Cognee (deferred Wave 4 late)

**Trigger:** Hermes brain necesita procesar multimodal data (PDFs, audio, video) además de text streams. Solo entonces.

---

## Wave 5+ — Optional cognition extras

**Sin trigger de activación obligatorio. Solo si el caso aparece.**

- A2A tables (Agent Cards, Peers, Interactions)
- LastReadAt context decay
- TEE/zkML schema `assurance`
- TelemetryAggregates / DriftMetrics si Phoenix no alcanza

---

## Decisiones abiertas (a resolver en sus respectivas olas)

### Wave 2 abiertas

1. ¿AgentProfile.CalibrationScore se denormaliza a `agent.AgentActor` para query performance? **Decisión:** NO inicialmente. Solo si query bottleneck real.
2. ¿PolicyDecisionSample 5% sampling se hace en trigger DB o backend C#? **Decisión:** backend C# antes de INSERT (más control, menos load DB).
3. ¿OPA self-hosted o Styra OPA Cloud? **Decisión pendiente.** Self-hosted preferred por sovereignty thesis.

### Wave 3 abiertas

1. ¿`surface.ToolDefinition` versionado guarda artifact completo o solo metadata? **Decisión:** solo metadata + git ref al artifact real.
2. ¿RLS policies por tenant o por user? **Decisión pendiente** según cliente real que aparezca.

### Wave 4 abiertas

1. ¿Graphiti escribe a Neo4j Community o Aura? **Decisión:** Community por sovereignty.
2. ¿Per-brain isolation = Neo4j database per brain o namespace per brain? **Decisión pendiente** según performance real.

---

## Anti-patterns que NO se permiten

Si en cualquier wave aparece presión para hacer alguna de estas, rechazar:

1. Microservicios prematuros (NO antes de 5+ servicios reales con boundaries claros)
2. Kafka antes de event volume real (>1000 events/sec sustained)
3. Kubernetes antes de tener 3+ servicios productivos
4. Multi-tenant RLS antes del segundo cliente real
5. A2A tables antes de tener segundo agente externo no controlado
6. Microsoft Agent Framework (Python-first decision)
7. Mapbox (DeckGL puro, ya decidido)
8. Pinecone/Weaviate (pgvector ya cubre)
9. FalkorDB (Neo4j Community decisión)
10. Augur, Drools, Camunda DMN (OPA + Rego decisión)

---

## Cómo retomar en chat nuevo

**Si estás iniciando Wave 2:**
1. Cargar `IPM_Wave1_Frozen_Architecture.md`
2. Avisar: "Wave 1 está deployed. Voy a empezar Wave 2 con `04_ai.sql`. ¿Listo?"
3. Decidir las 3 decisiones abiertas de Wave 2 antes de generar

**Si estás en medio de Wave 2:**
1. Cargar `IPM_Wave1_Frozen_Architecture.md` + lo que ya generaste de Wave 2
2. Avisar exactamente qué archivo se generó último y cuál sigue

**Si saltás de Wave a Wave:**
- NO permitido. El gating es estricto. Si querés hacerlo igual, justificar por qué el trigger se cumple antes de tiempo.

---

## Migración de datos `public.*` → canonical multi-schema

**Esto NO es Wave 2. Esto es bridge entre Wave 1 deploy y Wave 2.**

Pasos:

1. Ejecutar 01_core.sql + 02_agent.sql + 03_governance.sql en `ipm_sql` (otra DB de test primero)
2. Validar que schemas se crean sin error
3. Migrar `public.Persons` → `core.Entity` con `EntityType='person'` via INSERT...SELECT
4. Migrar `public.Companies` → `core.Entity` con `EntityType='company'`
5. Migrar `public.Countries` → `core.Entity` con `EntityType='country'`
6. Deduplicar (usar `LegacyMappings` jsonb para trackear el legacy IntId)
7. Migrar relations existentes a `core.RelationEdge` con `OriginLayer='ingestion'`
8. Validar GiST EXCLUDE constraint no rechaza datos
9. Validar audit triggers loggean correctamente a `governance.*ChangeLog`
10. Drop `public.*` solo después de validación completa

**Tiempo estimado:** 5-10 días de trabajo concentrado.

---

## Resumen accionable

| Pregunta | Respuesta |
|---|---|
| ¿Qué hago próximo Day 1? | Migrar datos `public.*` al canonical |
| ¿Cuándo empiezo Wave 2? | Después de migración exitosa |
| ¿Cuántas líneas de código son Wave 2? | ~600-1000 SQL + 200 C# |
| ¿Qué bloquea Wave 3? | Cliente externo real |
| ¿Qué bloquea Wave 4? | Cassandra brain operativo con caso temporal |
| ¿Cuándo está "listo Meridian"? | Wave 3 completado con 1+ cliente productivo |
