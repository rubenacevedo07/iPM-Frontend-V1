# Sprint 2 — Preparation (IPM Frontend V1)

**Status:** planning / not started (Sprint 1 closed at tag `v1-phase-10` on `master`).  
**Companion:** `docs/skills/ipm-frontend-v1-sprint.md` (adds a Sprint 2 pointer in the tracker).

---

## 1. Handoff from Sprint 1

| Item | State |
|------|--------|
| Globe + Deck.gl | `GlobeBridge`, rotation, entities, ArcLayer (`v1-phase-8`) |
| Overlays | Company + Person hosts, URL truth, `app.machine` |
| Production build | `npm run build` expected green (`v1-phase-10` line) |
| **GATE C** (manual) | Still optional per `docs/PHASE_9.md` — run before hardening graph+globe crossfade if you want the metric on record |
| Deferred “wave 1” | Phase 7.1 (persons on globe), 7.2 (country risk fills), 7b (MapView), `PHASE_8_DEBT` items — **can** interleave with Sprint 2 if product priority says so |

---

## 2. Mission (from architecture + sprint charter)

Sprint 2 extends the workstation with:

- **GraphEngine** — Three.js **vanilla** (no R3F), Worker + **InstancedMesh**, layout/propagation jobs with **latest-wins** + `AbortSignal`.
- **Second engine in EngineManager** — crossfade with globe (CSS/DOM compositor pattern already used for EngineSlot); stress criteria in `docs/skills/ipm-engine-runtime.md` §transition stress harness.
- **VsOverlay** (and related URL/navigation) — as spec’d when you lock UI scope.
- **Recovery modes** — e.g. `failed → retry` / `DEGRADED` (VRAM/FPS floor) per `ipm-engine-runtime` (not implemented in Sprint 1).

---

## 3. Non-negotiables (same constitution as Sprint 1 + engine layer)

- **No R3F** for GraphEngine — `docs/engine-r3f-decision.md`.
- **No `fetch` in engines** — contracts + mappers at boundary; Rule 2 remains.
- **Engines are imperative** — `init` / `destroy` / loop outside React; EngineManager owns lifecycle.
- **Workers:** latest-wins per job kind; discard stale worker results.
- **Destroy path** — cancel rAF, abort workers, dispose Three/GL, `forceContextLoss()` where applicable.
- **ADR-0001** still applies for AppShell / routing / auth/theme stubs unless a new ADR supersedes.

---

## 4. Must-read before coding

| Order | Document |
|-------|----------|
| 1 | `docs/skills/ipm-engine-runtime.md` — `GraphEngine`, stress harness, runtime rules |
| 2 | `docs/graph-engine-research.md` — blueprint, worker protocol, open questions |
| 3 | `docs/engine-r3f-decision.md` — Three vanilla only |
| 4 | `docs/state-model.md` — 4-level state (if touching workspace/orchestration) |
| 5 | `src/engine/engineFactory.ts` + `contracts/` — how `globe` plugs in today |
| 6 | `CLAUDE.md` — global invariants |

---

## 5. Proposed phase plan (indicative hours — calibrate in kickoff)

| Phase | Focus | Hours (est.) | Notes |
|-------|--------|--------------|--------|
| **S2-0** | Kickoff: branch, lock scope (VsOverlay depth, 7.1 overlap), spike Three+Worker in isolation | 2–4h | Optional: run GATE C baseline |
| **S2-1** | Contracts: `GraphEngineInput`, `EngineId` / `createEngine('graph')`, pure types in `contracts/` | 4–6h | No DTOs in engine (Rule 4) |
| **S2-2** | `GraphEngine` skeleton: scene, camera, `InstancedMesh` placeholder, resize, `dispose` | 6–8h | Match `IEngineBridge` / `VisualEngine` patterns from globe |
| **S2-3** | Worker: `graph.worker.ts`, job kinds, revision discard, postMessage contract | 6–8h | From research doc |
| **S2-4** | EngineManager: `ENGINE.SWAP` globe↔graph, crossfade, leak test | 6–8h | Stress harness from skill |
| **S2-5** | VsOverlay + router + machine events (minimal) | 4–6h | Align with ADR / `navigationActor` |
| **S2-6** | Recovery: retry/backoff, DEGRADED threshold (TBD) | 4–6h | Optional last |

**Total rough range:** ~32–46h — adjust with one planning session.

---

## 6. Open questions (carry from `graph-engine-research.md`)

Resolve in **S2-0 kickoff**, not mid-implementation:

- OffscreenCanvas vs main thread for hit-testing complexity.
- 2D vs 3D layout for first ship (2D often wins for FPS).
- Where layout state lives (workspace machine vs recompute on open) — ties ADR-0002 if you introduce it.
- DEGRADED thresholds (VRAM / FPS).

---

## 7. First session checklist (when you start S2-0)

- [ ] Create branch `sprint-2` (or `phase-s2-graph`) from `master` @ `v1-phase-10` (or latest).
- [ ] Add `three` dependency (version pin after spike).
- [ ] Confirm Vite worker build: `new URL('./graph.worker.ts', import.meta.url)`.
- [ ] Read §transition stress harness in `ipm-engine-runtime.md`.
- [ ] Decide: Sprint 2 **only** graph, or interleave **7.1** (persons on globe) — product call.

---

## 8. Explicitly later (not required to *start* Sprint 2)

- Full TanStack Query cancellation pattern (see `PHASE_5_DEBT` — Sprint 2 workers may still pair with it).
- Landing pages / marketing (`capability-matrix` — out of sprint).
- Real chart implementations in company overlay (stubs from `v1-phase-10`).

---

## 9. Tag / naming

- Suggest milestone tag after S2-4 or full sprint: **`v2-sprint-2-graph`** (or per-phase tags `v2-phase-s2-1` …) — **team convention TBD** at kickoff.
