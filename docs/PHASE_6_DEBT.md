# Phase 6 — Technical Debt Log

**Branch:** `phase6-person`
**Tag:** `v1-phase-6`
**Scope closed:** v3 canonical `features/person-overlay/` (12 of 13 files, RelationCenterPanel orphan skipped) + 5 transitive deps (domain/api, domain/queries, 3 machines) + V1 `PersonOverlayHost` adapter + V1 `app.machine` extended with `ENTITY.CLOSE` alias.

---

## (a) RelationCenterPanel canonical orphan

**State:** `v3/features/person-overlay/RelationCenterPanel.tsx` (359 LOC) has zero importers inside the folder (Stage 0 audit confirmed). Not copied in Phase 6 per Decision C.2.

**Risk:** If a future consumer (Phase 7 graph integration, PersonSoloView extension) wires in RelationCenterPanel, the file is missing from V1 and must be copied verbatim on-demand.

**Action:** Import-on-demand. No current blocker. Re-audit in Phase 7 when graph/relation flows are wired.

---

## (b) `domain/api.ts` bare-fetch egress — Rule 2 paper violation

**File:** `src/domain/api.ts` (35 lines, v3 verbatim) uses `fetch()` at line 15 for HTTP egress. V1 has `src/services/api/apiClient.ts` as the Rule 2 "single network egress" authority.

**Why not migrated now:** Per pre-Stage-1 audit decision (a) — Rule 6 (canonical immutability) outranks Rule 2 during port. `queries.ts` calls `apiGet` from `./api` expecting the canonical signature; migrating to apiClient would require editing canonical `queries.ts` + `api.ts`.

**Affected flows (Phase 6 scope only):**
- `PersonOverlay` → `useQuery(qk.person(id), fetchers.person)` → `apiGet('/persons/:id/intelligence')` → bare fetch
- `PersonOverlay` → `useQuery(qk.personNeighbors(nodeId), fetchers.personNeighbors)` → bare fetch
- `StudioRelationView` → `qk.relation(...)` → bare fetch

**Resolution:** Phase 9 — write V1-side adapter that routes `apiGet`/`apiPost` through `apiClient.ts`. Canonical `queries.ts` + `api.ts` stay verbatim; V1 owns a replacement `api.ts` that maintains the export shape.

---

## (c) 20× cycle memory test — Phase 6

**Protocol:** Same as Phase 5 entry (d). Open/close `?overlay=person&id=7` 20× + forced GC + delta measurement. Threshold `<5 MB`.

**Current status:** **Not yet measured.** Browser-interactive test; cannot be automated.

**Action required before v1-phase-6 production ship:** User runs 20× cycle in Chrome, updates this entry with:
- `PASS — residual <5 MB (measured YYYY-MM-DD)` OR
- `FAIL — residual X MB → investigate XState sub-machine cleanup (entity-inspector, graph-interaction, tabs spawned from person-overlay.machine)`

**Phase 6-specific leak suspects (if delta fails):**
- `personOverlayMachine` spawns 3 sub-machines (inspector, graph, tabs) on every mount via `spawn()`. XState v5 auto-stops when parent stops, but nested ActorRef leaks are non-trivial to audit.
- `react-query` cache entries for `qk.person(id)` + `qk.personNeighbors(nodeId)` persist per default cache policy (`staleTime: 30s` from AppProviders). Not a leak but accumulates.
- `ShapeEgoGraph.tsx` (380 LOC) uses `useRef` + imperative canvas — check if any RAF / ResizeObserver / listener lacks cleanup.

---

## (d) `person-overlay.scss` + global CSS footprint growth

**New global stylesheet loaded by Phase 6:** `src/features/person-overlay/person-overlay.scss` (co-imported by CinematicTransition, CompactProfilePanel, PersonLeftPanel, PersonNodeInfoPanel, PersonSoloView, RelationCenterPanel [orphan], ShapeEgoGraph, StudioRelationView).

**Cumulative CSS weight (Phase 5 + Phase 6):**
- Phase 5: `global.scss` + `overlay.scss` + `overlay-legacy.scss` + `company-overlay.scss` = ~140 KB
- Phase 6: + `person-overlay.scss` (unmeasured, add to audit)

**Risk:** Selector leaks from person-overlay.scss into engine/globe/company-overlay. Persons and Companies share several class prefixes in v3's legacy stylesheets.

**Action:** Same as Phase 5 entry (c) — audit in Phase 9. Scope classes via CSS modules, `:where()`, or `@scope`. Rule 6 prohibits editing canonical SCSS during sprint 1.

---

## (e) Two canonical v3 bugs absorbed by V1 shims

### (e.1) `entity-inspector.machine` wrong import path

**Bug:** `v3/src/machines/entity-inspector.machine.ts:23` imports `getScene` from `'@/components/overlays/sceneMap'`, but the actual `sceneMap.ts` file lives at `'@/features/person-overlay/sceneMap'`. The canonical path does not exist in v3 either (`find IPM_Frontend/src -name "sceneMap*"` returns only the person-overlay version).

**V1 resolution:** New shim at `src/components/overlays/sceneMap.ts` re-exports canonical `getScene` from the real location. Analog to Phase 5 CompanyLogo shim. Rule 6 preserved (canonical entity-inspector.machine.ts + person-overlay/sceneMap.ts untouched).

### (e.2) `entity-inspector.machine` wrong arity on getScene call

**Bug:** `v3/src/machines/entity-inspector.machine.ts:53` calls `getScene(e.nodeId, e.name)` with **2 arguments**. Canonical `getScene` signature is `(id: number, type: EntityType, name: string)` — **3 arguments**. Runtime result: `nodeId` bound as `id`, `name` bound as `type`, real `name` param is `undefined` → crash on `name.toUpperCase()` in FALLBACK branch when entity-inspector's ENTITY.OPEN action runs.

**V1 resolution:** Same shim at `src/components/overlays/sceneMap.ts` widened to accept BOTH signatures:
- 3-arg canonical: `(id: number, type: EntityType, name: string)`
- 2-arg buggy: `(nodeId: string, name: string)` — shim parses `nodeId` → extracts type + id, generates a safe fallback `name` like `"PERSON #7"` when name is empty.

Rule 6 preserved; canonical entity-inspector.machine.ts retained verbatim.

**Upstream v3 action:** Fix entity-inspector.machine.ts line 23 import path + line 53 arity. When upstream fixes this, remove the V1 shim's 2-arg branch in one commit. File a v3 bug reference when available.

---

## (f) `AppProviders.tsx` AppActor re-export — V1 edit

**Change:** `src/app/AppProviders.tsx` added `export { AppActor }` (V1-owned edit, not a canonical edit).

**Why:** v3 PersonOverlay imports `AppActor` from `'@/app/AppProviders'`. V1's AppProviders imported AppActor but did not re-export it. Phase 5's CompanyOverlayHost imported AppActor directly from `./app.machine` — different convention — so the Phase 5 code path never surfaced this. Phase 6 requires the re-export for the canonical PersonOverlay import chain to resolve.

**Risk:** None. Simple re-export; both import paths now work (`'@/app/AppProviders'` and `'@/app/app.machine'`).
