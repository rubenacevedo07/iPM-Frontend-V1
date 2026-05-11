# Meridian / IPM — Architecture Decision Records (ADR)

**Estado:** 16 decisiones doctrinales lockeadas en Wave 1.
**Propósito:** Cada decisión documenta contexto, alternativas consideradas, y por qué se eligió la actual. Cualquiera que retome el proyecto puede entender el "por qué" sin re-discutir.

---

## ADR-001: Thin core, never extended beyond minimal origin trace

**Decisión:** `core` schema contiene solo Entity, RelationEdge, RelationEvidence + minimal origin trace (CreatedBy, BatchId, CreatedByAgent). Nunca scoring, predictions, runtime config, calibration, policy decisions.

**Alternativas consideradas:**
- Core "rich" con todas las columnas que cualquier query necesita → rechazado por contaminar concerns
- Core "ultra-pure" sin origin trace → rechazado, provenance es structural truth

**Razón:** Multi-runtime portability. Si mañana cambia el agent runtime, OPA, Graphiti, MCP — core sigue intacto.

---

## ADR-002: CanonicalNodeKey, no McpUri/CanonicalUri

**Decisión:** Generated column en `core.Entity`: `'entity:' || NodeId`. Backend prepende prefix (meridian:, ipm:, tenant-X:) at query time.

**Alternativas:**
- `meridian:entity:person:powell` hardcoded → rechazado, acopla DB a brand
- `McpUri` específico → rechazado, acopla a protocol

**Razón:** Protocol-agnostic. Mañana A2A o REST también pueden resolver entities con misma DB.

---

## ADR-003: ASCII-only NodeId

**Decisión:** Regex `^[a-z_]+:[A-Za-z0-9._\-]+$` en NodeId. UTF-8 vive en CanonicalName.

**Alternativas:**
- Permitir UTF-8 en NodeId (München, São Paulo) → rechazado
- Solo lowercase ASCII → rechazado, no soporta CUSIP/ISIN (US912810TM09)

**Razón:** Canonical IDs son deterministic slugs URL-safe. Display names con UTF-8 separados.

---

## ADR-004: AgentActionLedger usa JSONB envelope shape explícito

**Decisión:** `AffectedEntities`/`AffectedEdges` como `[{"entityId":"uuid","action":"promoted|created|...|read"}, ...]`.

**Alternativas:**
- m:m tables `LedgerEntity`/`LedgerEdge` separadas → rechazado, premature normalization
- `AffectedEntityIds uuid[]` array simple → rechazado, no soporta metadata por affected
- jsonb sin shape definido → rechazado, drift garantizado

**Razón:** JSONB envelope simple en Wave 1. Normalización m:m solo si query bottleneck real aparece.

---

## ADR-005: CognitiveContract en `governance` schema (movido de core)

**Decisión:** Cognitive contracts viven en `governance.CognitiveContract`, NO en core.

**Alternativas:**
- Core con CognitiveContract integrado → rechazado, contaminación de concerns
- Policy schema único con contracts y enforcement runtime → rechazado, confunde abstracto vs runtime

**Razón:** Core responde "what exists". Governance responde "what is allowed". Contract abstract intent va a governance. Runtime engine (OPA Rego) va a `policy` schema separado.

---

## ADR-006: Cognitive contract trigger ONLY en RelationEdge, NO en Entity

**Decisión:** Trigger `trg_RelationEdge_cognitive_contract` solo aplica en RelationEdge mutations.

**Alternativas:**
- Triggers en Entity Y RelationEdge → rechazado, demasiada friction
- Sin triggers, solo enforcement en backend → rechazado, bypass posible

**Razón:** Contracts gobiernan high-impact relation assertions, no display name edits. Crear edge causal crítico necesita governance. Cambiar nombre display no.

---

## ADR-007: Single reusable audit trigger function

**Decisión:** Una function `governance.fn_audit_change()` que detecta TG_OP + TG_TABLE_NAME y rutea al ChangeLog correcto.

**Alternativas:**
- 6 triggers separados (2 tablas × 3 ops) → rechazado, mantenimiento triple
- Trigger por tabla con lógica duplicada → rechazado, drift garantizado

**Razón:** DRY. Una sola función mantenida vs seis paralelas que divergen.

---

## ADR-008: Bitemporal GiST EXCLUDE en Wave 1, NO Wave 2

**Decisión:** `EX_Edge_NoOverlap` en `01_core.sql` desde día 1.

**Alternativas:**
- GiST en Wave 2 cuando "se necesite" → rechazado, datos contradictorios entran sin saber
- GiST opcional con feature flag → rechazado, complejidad extra sin beneficio

**Razón:** Si ya sabés que temporal es fundacional, no lo metés como patch después. Bitemporal correcto desde bootstrap.

---

## ADR-009: NO IF NOT EXISTS en schema, SÍ en extensions

**Decisión:** `CREATE SCHEMA core` (fail-fast). `CREATE EXTENSION IF NOT EXISTS pgcrypto` (tolerante).

**Alternativas:**
- IF NOT EXISTS en todo → rechazado, no es bootstrap real, es migración
- Sin IF NOT EXISTS en nada → rechazado, extensions pueden pre-existir por otra app

**Razón:** Schema-level fail-fast es la doctrina. Extensions son prerequisites portable, no parte del canon.

---

## ADR-010: PolicyDecisionSample sampleado 5%, retention 90 días

**Decisión:** Solo 5% de decisiones OPA se persisten, retention auto-cleanup a 90 días. PolicyViolation siempre durable.

**Alternativas:**
- Persistir 100% → rechazado, tabla explota a millones de rows/día
- 0% sampling → rechazado, no hay forma de auditar comportamiento normal
- 1% / 30 días → rechazado, demasiado poco para detectar patterns

**Razón:** Balance entre observability y storage. Violations son críticos siempre. Decisions normales son interesantes pero scaleables.

---

## ADR-011: Per-brain isolation Graphiti graphs

**Decisión:** Cada brain (Cassandra, Hermes, Memo, etc.) tiene su propio graph en Neo4j. NO shared graph.

**Alternativas:**
- Shared graph con namespace por brain → rechazado, cross-contamination posible
- Sin Graphiti, custom temporal layer → rechazado, reinventar la rueda

**Razón:** Memory divergence prevention. Si Cassandra y Hermes razonan diferente sobre mismo fact, NO deben verse afectados mutuamente hasta promotion al canonical core.

---

## ADR-012: Estados explícitos proposed/validated/promoted/rejected/stale

**Decisión:** Toda working memory de Graphiti tiene estado explícito. NO "implicit truth".

**Alternativas:**
- Implícito (todo lo que está en memoria = truth) → rechazado, garbage propagates
- Solo proposed/promoted (binary) → rechazado, no captura disputed/stale

**Razón:** Graphiti memory divergence prevention requiere estados explícitos para que el promotion al canonical sea deterministic.

---

## ADR-013: Cognee downgrade a Wave 3+, NO eliminado

**Decisión:** Cognee se mantiene como complemento a Graphiti, NO reemplazo. Activación solo cuando multimodal (Hermes brain) necesite procesar PDFs/audio.

**Alternativas:**
- Cognee primary → rechazado, Graphiti es mejor temporal cognitive
- Eliminar Cognee → rechazado, multimodal sigue siendo case real futuro

**Razón:** Graphiti = temporal text streams. Cognee = multimodal ingestion. Complementarios, no competitivos.

---

## ADR-014: Neo4j Community para Graphiti, NO FalkorDB

**Decisión:** Wave 4 usa Neo4j Community Edition.

**Alternativas:**
- FalkorDB (Redis-based) → rechazado por madurez ecosystem y Graphiti compatibility
- Aura cloud → rechazado por sovereignty thesis
- Memgraph → considerado, rechazado por menor adoption

**Razón:** Graphiti tiene adapter nativo para Neo4j. Community Edition es self-hosted, sovereignty-compatible, free.

---

## ADR-015: AgentLedger en `agent` schema (movido de core)

**Decisión:** AgentActionLedger vive en `agent`, NO en core.

**Alternativas:**
- En core (provenance forensic = canonical truth) → rechazado, contamina core con cognition concerns
- En governance → rechazado, governance es contracts/audit, no agent attribution

**Razón:** Agent identity + actions son cognition layer, no truth layer. Loose coupling al core via referencia textual de ActorSlug.

---

## ADR-016: CreatedBy + CreatedByAgent pueden coexistir

**Decisión:** Ambas columnas pueden tener valor simultáneo. Caso: agent acting on behalf of user.

**Alternativas:**
- Mutuamente exclusivos (XOR constraint) → rechazado, no captura caso real
- Solo CreatedBy (humanos puros) → rechazado, no permite agent attribution
- Solo CreatedByAgent (agents puros) → rechazado, no permite user direct edits

**Razón:** Realismo operacional. Frontend lanza autoresearch (user logged in) que dispara agent (Atlas). Resultado: ambos colaboraron, ambos atribuidos.

---

## Cómo agregar nuevos ADRs

Cuando una decisión nueva se locke en Wave 2-4:

1. Numerarla (ADR-017, ADR-018, ...)
2. Mismo formato: Decisión / Alternativas / Razón
3. Agregar al final de este archivo
4. NO sobrescribir ADRs anteriores. Si una decisión cambia, crear ADR nuevo que dice "supersedes ADR-X" con razón del cambio.

---

## Decisiones que NO son ADRs (operacionales, no doctrinales)

Estas pueden cambiar sin ADR formal:

- Específicos de Postgres tuning (work_mem, shared_buffers)
- Versions exactas de NuGet packages
- Naming de columns no-críticas
- Index strategies que se ajustan por performance

---

## ADRs candidatos pendientes (Wave 2-3)

Estos van a necesitar ADR cuando se decidan:

- ADR-017: Calibration score denormalization strategy
- ADR-018: OPA self-hosted vs cloud
- ADR-019: PolicyDecisionSample sampling location (DB trigger vs backend)
- ADR-020: ToolDefinition versioning storage (full artifact vs git ref)
- ADR-021: RLS strategy (per-tenant vs per-user)
- ADR-022: Graphiti Neo4j topology (database-per-brain vs namespace-per-brain)
