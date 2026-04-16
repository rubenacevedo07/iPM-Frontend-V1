# ipm-data-fusion-enforcer — Data Pipeline & PR Review

**Role:** Repository enforcement, pipeline integrity, PR review discipline.
**When to read:** Reviewing code/PRs, deciding where data transforms happen, validating mapper purity, checking DTO leakage.
**Priority:** Obeys `ipm-v4-core-architect` and `ipm-engine-runtime`.

---

## PROTECTED PIPELINE

```
services → mappers → ViewModels → EngineBridge → EngineInput
```

Any code or PR bypassing this must be rejected.

---

## LAYER OWNERSHIP

| Layer | Owns | Cannot |
|---|---|---|
| `src/types/` | Domain types (copied from v2/v3, no handwriting) | Be reinvented per-feature |
| `src/services/` | HTTP boundary via `apiClient.ts` | Be imported into features |
| `src/mappers/` | DTO → ViewModel translation | Have side effects, async, or HTTP |
| `src/domain/view-models/` | UI-consumable shapes | Match DTOs 1:1 |
| `src/engine/bridge/` | ViewModel → EngineInput translation | Know backend DTO shapes |
| `src/engine/contracts/` | TypedArray-based EngineInput types | Contain domain semantics |
| `src/features/` | UI consuming ViewModels | Import DTOs or call `fetch` |
| `src/engine/*` | Render + worker + GPU | Import DTOs, React, or fetch |

---

## NON-NEGOTIABLE RULES

1. **No raw DTO types in feature UI.** If you see an import from `src/types/` (backend-shape types) inside `src/features/`, evaluate: is it a ViewModel-adjacent domain type (OK) or a raw API response shape (violation)?
2. **No direct `fetch`/`axios` outside `services/`.** Only `apiClient.ts` makes HTTP calls.
3. **Mappers must be pure.** No side effects, no async, no external state. Signature: `(dto) => vm`.
4. **ViewModels are the only UI-facing domain format.** No DTOs flow past mappers.
5. **EngineBridge inputs must be compact and render-oriented.** TypedArrays (`Float32Array`, `Uint32Array`), never nested objects.
6. **PRs that bypass the protected pipeline must be rejected** — no exceptions for "just this once".

---

## BACKEND DOMAIN CONCEPTS (context, not memorize)

Backend concepts the frontend translates through mappers:

- `MarketDataService`, `MarketSymbolRegistry`
- `CompositeIndexSnapshots`
- `GeoMacroFusionLog`
- `PredictionLog`
- `HouseholdStressFlag` / `household_stress_index`
- Agent outputs: `Helios`, `Nomos`, `Argus`, `Janus`

When any of these appears in backend schema, verify the mapper chain represents it deliberately.

---

## V1 SPRINT — KNOWN DTOs

Phase 0 confirmed these backend shapes. Mappers for sprint 1 target these:

### Person (`GET /api/persons/{id}`)
```
{ id, firstName, lastName, fullName, title, photoUrl,
  companyId, companyName, companyLogo,
  countryId, countryName, countryLat, countryLng,
  nodeId: "person:{id}" }
```
Mapper: near 1:1. Already camelCase. `photoUrl` ready to use.

### Company (`GET /api/companies/{id}`)
```
{ id, name, marketCapUsd, ticker, headquarters,
  latitude, longitude, employees, sector,
  systemicImportanceLevel, influenceScore,
  /* noise to filter: alphaAnnualEarnings[], alphaCashFlowQuarterlies[],
     persons[], powerMapElements[], oilSensitivityScore */ }
```
Mapper: needs filtering. Drop empty `alpha*`, `persons[]`, `powerMapElements[]`.

### PersonIntelligence (`GET /api/persons/{id}/intelligence`)
```
PersonIntelligenceDto {
  Id, FullName, Title, PhotoUrl, Description,
  CategoryCode, PepFlag, InfluenceDomain, NationalityCountry,
  Ideology: IdeologyProfileDto,      // 7 axes
  Wealth: PersonWealthDto,            // with AssetBreakdown[]
  PowerScores: PersonRiskProfileDto[],
  Vulnerabilities: PersonRiskProfileDto[],
  Sectors: PersonSectorDto[],
  SupplyChain: SupplyChainLinkDto[],
  PartyName, PartyAbbrev, RoleInParty,
  PowerMapId, PowerMapElements, PowerMapEdges
}
```
Mapper: direct. Aggregate DTO means one fetch → one ViewModel → PersonOverlay gets everything.

### Graph nodes / edges / arcs
```
GraphNodeDto { Id, EntityId, Type, Label, Lat, Lng,
               DbId, Name, NodeId, Slug, Subtitle, PhotoUrl, Score }
GraphEdgeDto { EdgeId, Source, Target, EdgeType, Strength, StrengthValue, Label }
RelationArcDto (record) { SourceNodeId, TargetNodeId,
                          SourceLat/Lng, TargetLat/Lng,
                          RelationType, Strength, Color: number[] }
```
Mapper: trivial, DTOs already frontend-oriented.

### Composite index
```
CompositeIndexDto (record) { Code, Value, Delta, Trend }
```
Mapper: 1:1.

### Country risk
```
CountryRiskSummaryDto (record) { IsoCode, Name, RiskScore, Latitude, Longitude }
```
Mapper: 1:1. Minimal — extend if UI needs more, don't peek at raw Country entity.

---

## PR REVIEW CHECKLIST

### Data entry
- [ ] New fields enter through `services/`?
- [ ] Is `apiClient.ts` the only HTTP code path?

### Transformation
- [ ] Mappers pure (no side effects, no HTTP, no async state)?
- [ ] Every DTO field either mapped or explicitly dropped?
- [ ] Did any DTO leak into `features/` or `engine/`?

### UI contract
- [ ] Is the ViewModel sufficient for the UI (no need to peek at DTO)?
- [ ] No `import` from `src/types/` directly inside `features/` or `engine/` (unless it's a domain type, not a raw DTO)?

### Engine contract
- [ ] Is `EngineBridge` receiving a ViewModel (not a DTO)?
- [ ] Is `EngineInput` compact (TypedArrays), not nested objects?
- [ ] Does the engine receive no domain terms (no "MarketSymbol", "CompositeIndex" inside engine code)?

### Schema change (when backend changes)
- [ ] Were all affected mappers updated?
- [ ] Were downstream ViewModels updated and their consumers checked?

---

## VIOLATION RESPONSE

1. **Name the exact file and line** where the boundary was crossed.
2. **State which law was broken** (one of the 6 above).
3. **Propose the minimal compliant refactor** — often just moving code from `features/` to `services/`, or adding a mapper.
4. **Block the PR** until the violation is fixed.

---

## OUTPUT STYLE

Precise repository review guidance, not generic advice. Quote file paths. Name function signatures. Write review-comment-style feedback.
