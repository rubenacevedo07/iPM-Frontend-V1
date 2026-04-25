# ipm-frontend-v1-sprint — Sprint Tracker

**Role:** Live state of the iPM_Frontend_V1 sprint. Read at every session start. Update at every session end.
**When to read:** Resuming the sprint, starting a phase, checking progress, "en qué vamos".
**Priority:** lowest of the 5 docs — this is operational state, not architectural law.

---

## IDENTITY

- **Repo:** `iPM_Frontend_V1` (new, clean rebuild)
- **Started:** [FILL ON PHASE 0 COMPLETION]
- **Budget:** ~40h 30min / ~12 days of 3-4h each
- **Mission:** Globe-first intelligence workstation MVP. One screen. Globe full-bleed. Overlays float. Video cinematic intro.

Sprint 1 of 2. Sprint 2 adds GraphEngine (Three.js vanilla + Worker + InstancedMesh), VsOverlay, recovery modes.

---

## PHASE PLAN

| # | Phase | Hours | Day | Deliverable |
|---|---|---|---|---|
| 0 | Pre-flight + env (https proxy) + operational docs | 2h 30min | 1 | Vite scaffold, `.env`, proxy to `https://localhost:32771`, cert accepted, CLAUDE.md + docs copied |
| 1 | Capability matrix verification + foundation copy | 5h | 2 | Types/services from v3, hooks+apiClient from v2, duplication dropped, `tsc --noEmit` → 0 |
| 2a | AppShell + app.machine + TanStack Router URL sync | 4h | 3 | Parallel machine, URL ↔ machine bidirectional |
| 2b | EngineManager actor with full contracts | 4h | 4 | VisualEngine, EngineBridge, engineFactory, GlobeBridge, 5-state actor, EngineSlot |
| 3 | GlobeEngine real (DeckGL vanilla) + Video intro | 4h | 5 | Globe rotating full-screen + MapCinematicIntro on first load. **GATE A** |
| 4 | AppHeader + SearchOverlay | 3h | 6 | Verbatim from v2, search result → URL change |
| 5 | Company overlay | 4h | 7 | globalCompanies verbatim from v2 |
| 6 | Person overlay | 4h | 8 | v10 verbatim from v3, machine nested. **GATE B** |
| 7 | Globe layers (real data) | 4h | 9 | ~100 entity dots + subtle country risk (top 20-30 only) + click handlers. 60fps target. |
| 8 | ArcLayer (AI supply chain) | 3h | 10 | Animated arcs from v3 |
| 9 | Polish + leak audit | 3h | 11 | `beforeunload` cleanup, 10x open/close no leak. **GATE C** |
| 10 | Integration + buffer | 4h | 12 | Bug fixing, demo-ready |

Total: ~40h 30min.

---

## PHASE 0 — CHECKLIST (2h 30min)

### Scaffold (45min)
- [ ] `npm create vite@latest iPM_Frontend_V1 -- --template react-ts`
- [ ] `npm i xstate @xstate/react @tanstack/react-query @tanstack/react-router`
- [ ] `npm i -D sass`
- [ ] Port 5178 in `vite.config.ts`
- [ ] `.gitignore` includes `.env`, `.env.local`, `node_modules`, `dist` BEFORE first commit
- [ ] Git init + first commit (no `.env` tracked — verify with `git ls-files | grep env` is empty)

### Environment — https self-signed backend (45min)
- [ ] Create `.env` with contents:
  ```env
  VITE_API_URL=/api
  VITE_HOST=https://localhost
  VITE_API_PORT=32771
  VITE_APP_NAME=IMP
  VITE_DEFAULT_THEME=cyberpunk
  VITE_DEV_AUTO_LOGIN=true
  VITE_GPT_API_KEY=
  ```
  Fill `VITE_GPT_API_KEY` locally with a fresh OpenAI key (never commit).
- [ ] `vite.config.ts` proxy:
  ```ts
  server: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'https://localhost:32771',
        changeOrigin: true,
        secure: false
      }
    }
  }
  ```
- [ ] Open `https://localhost:32771/swagger` in browser ONCE, accept self-signed cert manually.
- [ ] `npm run dev` — starts on port 5178
- [ ] Test proxy: `curl http://localhost:5178/api/persons/7` returns Elon Musk JSON

### Operational docs (30min)
- [ ] `CLAUDE.md` in repo root (from sprint artifacts)
- [ ] `docs/skills/ipm-v4-core-architect.md`
- [ ] `docs/skills/ipm-engine-runtime.md`
- [ ] `docs/skills/ipm-data-fusion-enforcer.md`
- [ ] `docs/skills/ipm-frontend.md`
- [ ] `docs/skills/ipm-frontend-v1-sprint.md` (this file)
- [ ] `docs/capability-matrix.md`
- [ ] `docs/engine-r3f-decision.md`
- [ ] `docs/state-model.md`
- [ ] `docs/graph-engine-research.md`
- [ ] `docs/PR_CHECKLIST.md` copied to `.github/PULL_REQUEST_TEMPLATE.md`

### Validation (30min)
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run dev` — default Vite page at http://localhost:5178
- [ ] DevTools Network: no CORS errors
- [ ] Commit `v1-phase-0`
- [ ] Update progress tracker (this doc)

---

## PHASE 1 — CHECKLIST (5h) — file-by-file verification with user

Instead of bulk-copying, verify each capability with the user before copying. Document decisions in `docs/capability-matrix.md`.

### Types (1h 30min)
- [ ] List `v3/src/types/*.ts` (ignore nested `types/types/`)
- [ ] List `v2/src/types/*.ts`
- [ ] For each file: confirm with user "v2 or v3?" (diff when unsure)
- [ ] Copy chosen to `V1/src/types/`
- [ ] `tsc --noEmit` → 0 errors (resolve first-pass failures)

### Services (1h)
- [ ] List `v3/src/services/` (ignore `services/services/`)
- [ ] Default: v3 unless a file is clearly better in v2
- [ ] Copy `apiClient.ts` from v2 specifically (canonical token refresh)
- [ ] Update broken import paths from source mix
- [ ] `tsc --noEmit` → 0 errors

### Hooks (1h 30min)
- [ ] List `v2/src/hooks/` (canonical)
- [ ] Copy all to `V1/src/hooks/`
- [ ] Resolve missing service/type dependencies (flag, don't invent)
- [ ] `tsc --noEmit` → 0 errors

### Shell tokens + config (30min)
- [ ] `v2/src/components/shell/tokens.ts` → `V1/src/shell/tokens.ts`
- [ ] `v2/src/config/apiConfig.ts` if exists

### Commit (30min)
- [ ] Update `docs/capability-matrix.md` with file-level decisions
- [ ] Commit `v1-phase-1`
- [ ] Update progress tracker

---

## PHASE 2B — CHECKLIST (4h) — EngineManager

### Contracts (1h)
- [ ] `src/engine/contracts/inputs.ts` — `GraphEngineInput`, `GlobeEngineInput`, `EngineSwitchPayload`, `GlobeCameraInput`
- [ ] `src/engine/contracts/engine.ts` — `VisualEngine<TInput>`, `EngineCapabilities`
- [ ] `src/engine/contracts/bridge.ts` — `EngineBridge<TVM,TInput>`, `EngineState`, `EngineEvent`

### Factory (30min)
- [ ] `src/engine/engineFactory.ts` — typed overloads
- [ ] Stub `GraphEngine` and `GlobeEngine` (empty method bodies)

### Bridge (1h)
- [ ] `src/engine/bridge/GlobeBridge.ts` — full impl
- [ ] `src/engine/bridge/registry.ts` — `bridgeRegistry` + `getBridge(mode)`

### EngineManager actor (1h)
- [ ] `src/engine/engineManager.actor.ts` — XState v5, 5 states: `idle → initializing → active → transitioning → crossfading → failed`
- [ ] Integrate into `app.machine` via `spawn`

### EngineSlot (30min)
- [ ] `src/components/engine/EngineSlot.tsx` — two sibling divs `engine-a`/`engine-b`, opacity transitions
- [ ] Mounted at root of AppShell

---

## PHASE 3 — CHECKLIST (4h) — Globe + Video intro

### GlobeEngine (2h 30min)
- [ ] `src/engine/globe/GlobeEngine.ts` implements `VisualEngine<GlobeEngineInput>`
- [ ] Uses `new Deck({...})` — NOT `<DeckGL />`
- [ ] `init()` creates Deck; `destroy()` calls `deck.finalize()`
- [ ] Basic layer: country outlines + auto-rotation

### Video intro (1h)
- [ ] Copy `MapCinematicIntro.tsx` from `v3/src/features/map-page/`
- [ ] Copy video assets to `V1/public/videos/`
- [ ] Mount in AppShell above EngineSlot
- [ ] `sessionStorage` flag: play only on first load of session

### Gate A validation (30min)
- [ ] Globe renders full-screen, rotating
- [ ] Video plays on first visit, not on refresh
- [ ] `EngineManager` in `active` state (XState devtools)
- [ ] Memory: 5x open/close tab, no heap growth
- [ ] `tsc --noEmit` → 0 errors
- [ ] Commit `v1-phase-3`

---

## PHASE 7 — CHECKLIST (4h) — Globe layers with strict budget

**Performance budget is non-negotiable.** If any layer breaks 60fps on rotation, reduce dots before optimizing render.

### Entity dots (2h) — target ~100 total
- [ ] `useGlobalPowerRanking({ limit: 30 })` → ScatterplotLayer for persons
  - Radius scaled by power score (min 4px, max 12px)
  - Color by category (POWER_FIGURE, etc.)
  - Click handler → `OPEN_PERSON { id }`
- [ ] `useCompanies()` → filter top 30 by `marketCapUsd` descending → ScatterplotLayer
  - Color by `sector` or `systemicImportanceLevel`
  - Click handler → `OPEN_COMPANY { id }`
- [ ] `useChokepoints()` + critical facilities → ~40 additional dots
  - Different icon/color to distinguish from persons/companies
- [ ] Verify total dot count in DevTools console: should NOT exceed ~105
- [ ] DevTools Performance → 60fps sustained during rotation with all three layers active

### Country risk fills (1h 30min) — subtle, filtered
- [ ] `useCountries()` + `useCompositeIndices()` → GeoJsonLayer
- [ ] Filter data BEFORE passing to layer: only countries with `RiskScore > 60`
  - Not all 195 countries — only the top 20-30 highest risk
- [ ] Color ramp: amber 600 (#BA7517) → red 800 (#791F1F)
  - Linear interpolation based on RiskScore
  - Max opacity: 0.25 (fill), 0.6 (stroke)
- [ ] Countries NOT in the high-risk set: no fill, only thin 0.3px stroke
- [ ] Verify visual: globe still reads as "night Earth with city lights", NOT political map

### Validation (30min)
- [ ] All 3 layers active simultaneously: 60fps sustained on rotation (Chrome Performance tab)
- [ ] Click on any entity dot → correct overlay opens with correct entity
- [ ] No console.error
- [ ] `tsc --noEmit` → 0 errors
- [ ] Memory: open/close overlays 10x, heap stable
- [ ] Commit `v1-phase-7`

### If framerate drops below 50fps
Do NOT add layer optimization first. Instead, in order:
1. Reduce entity dots by 20% (useGlobalPowerRanking limit → 25, useCompanies top 25)
2. If still below 50fps, drop to 15 chokepoints instead of 40
3. Only THEN consider layer-level optimizations (deck.gl `parameters`, instancing, etc.)

Reason: performance issues at this scale are almost always "too much data", not "inefficient rendering".

---

## GATES (hard blocks)

### GATE A — end Day 5 (after Phase 3)
- [ ] Video intro plays on first load, finishes smoothly
- [ ] Globe renders full-screen, rotating
- [ ] `EngineManager` in `active` state
- [ ] Memory stable: 5x open/close → no heap growth
- [ ] `tsc --noEmit` → 0 errors

### GATE B — end Day 8 (after Phase 6)
- [ ] PersonOverlay renders **Elon Musk (id=7)** with real data from `usePersonIntelligence(7)`
- [ ] CompanyOverlay renders **NVIDIA (id=1)** with real data from `useCompanyById(1)`
- [ ] No `console.error`
- [ ] `tsc --noEmit` → 0 errors
- [ ] No assumptions violated on globe budget — entity dots NOT yet wired to overlays, but globe renders with placeholder data at 60fps

### GATE C — end Day 11 (after Phase 9)
- [ ] Click on globe entity dot → correct overlay with correct entity
- [ ] URL refresh reloads exact state
- [ ] No React StrictMode cleanup warnings
- [ ] No memory leak over 20 open/close cycles
- [ ] Chrome Performance: 60fps sustained on globe rotation

---

## KNOWN BACKEND SHAPES (verified with curl)

Confirmed in Phase 0:

```
GET /api/persons/7 →
{
  id: 7, firstName: "Elon", lastName: "Musk", fullName: "Elon Musk",
  title: "CEO of Tesla", photoUrl: "Musk.jpeg",
  companyId: 7, companyName: "Tesla", companyLogo: "tesla.png",
  countryId: 1, countryName: "United States",
  countryLat: 38.8951, countryLng: -77.0364,
  nodeId: "person:7"
}
```
Mapper for PersonOverlay: trivial, 1:1.

```
GET /api/companies/1 →
{
  id: 1, name: "NVIDIA", category: "Technology",
  marketCapUsd: 4339000000000, ticker: "NVDA",
  headquarters: "Santa Clara, California, USA",
  latitude: 37.36883, longitude: -121.91337,
  employees: 36000, sector: "Technology",
  systemicImportanceLevel: "Critical",
  /* plus: alphaAnnualEarnings[], persons[], etc. — filter in mapper */
}
```
Mapper for CompanyOverlay: needs filtering (drop empty `alpha*`, `persons[]`, `powerMapElements[]`).

```
GET /api/persons/{id}/intelligence → PersonIntelligenceDto aggregate
{
  FullName, PhotoUrl, Ideology{7 axes}, Wealth{AssetBreakdown[]},
  PowerScores[], Vulnerabilities[], Sectors[], SupplyChain[],
  PartyName, RoleInParty, PowerMapId
}
```
Mapper for PersonIntelligencePanel: direct, fields match PersonOverlay needs.

---

## RED FLAGS DURING THE SPRINT

- Writing API response type by hand (Rule 1)
- `fetch(` outside `apiClient.ts` (Rule 2)
- New hook for something familiar (Rule 3)
- Refactoring copied components (Rule 4)
- DTO imports into `features/` or `engine/` (Rule 5)
- R3F "because it's cleaner" (Rule 6)
- Installing `openapi-typescript` (ruled out)
- `secure: true` in Vite proxy (breaks on self-signed)
- Implementing retry/backoff/DEGRADED (sprint 2)
- Implementing Worker GraphEngine (sprint 2)
- 4+ hours over a phase estimate
- Skipping a gate to keep moving
- Wiring more than 100 entity dots to the globe (exceeds layer budget — see Phase 7)
- Rendering country risk fills for ALL countries instead of filtered top ~30
- Using opacity > 0.3 on country fills (breaks "night Earth" visual)
- Skipping the 60fps measurement at Phase 7 end

---

## PROGRESS TRACKER (LIVE STATE)

**Last updated:** 2026-04-25
**Current phase:** **Phase 10 (next):** open with manual **GATE C** (DevTools) then integration / buffer (see `.cursor/plans/phase-10-kickoff.md`). Phase 9 *code* (unload, audit) is done; `GATE C` in the table stays open until that manual run. **Deferred** product: Phase 7.1, 7.2, 7b.
**Phases complete:** 9+ / 11 (through Phase 8 + prior phase tags on `master` / `phase8-arclayer`; numeric “complete” is approximate)
**Hours consumed:** _tracked per session in notes below_
**Gates passed:** A [x] B [x] C [ ]

| Tag / milestone | Note |
|-----------------|------|
| `v1-phase-8` | ArcLayer (static) + `NETWORK_RESOLVED` + `CMD.SET_ARCS` — supplier/client network on globe when company overlay open. See `PHASE_8_DEBT.md` for follow-ups. |
| (no tag) | Phase 9 code: page-unload `ENGINE.DISPOSE` on `master` + `PHASE_9.md` + static audit. Manual heap/FPS (GATE C) → Phase 10 kickoff. |

### Phase log
- [x] Phase 0 — Pre-flight + env + operational docs — ~1h / 2h 30min
- [x] Phase 1 — Capability matrix + foundation copy — ~2h / 5h
- [x] Phase 2a — AppShell + app.machine — ~3h / 4h
- [x] Phase 2b — EngineManager contracts — (done; see repo history)
- [x] Phase 3 — GlobeEngine + Video intro — **GATE A** passed
- [x] Phase 4 — AppHeader + SearchOverlay
- [x] Phase 5 — Company overlay
- [x] Phase 6 — Person overlay — **GATE B** passed
- [x] Phase 7 — Globe layers (30 company dots + rotation) — `v1-phase-7.3g`
- [x] Phase 8 — ArcLayer (static network edges) — `v1-phase-8`
- [x] Phase 9 — Polish + leak audit (code) — __h / 3h → **GATE C** manual deferred to Phase 10 kickoff (`PHASE_9.md`)
- [ ] Phase 10 — Integration + buffer — __h / 4h *(starts with `phase-10-kickoff` checklist)*

### Session notes

### Session 2026-04-16 — Phase 0
- Done: Vite scaffold (react-ts), dependencies installed (xstate, @xstate/react, @tanstack/react-query, @tanstack/react-router, sass), vite.config.ts with port 5178 + proxy secure:false, .gitignore full, git init, all operational docs verified in place, .github/PULL_REQUEST_TEMPLATE.md created. tsc → 0 errors. Proxy test → Elon Musk JSON via http://localhost:5178/api/persons/7.
- Broke: Nothing.
- Next: Phase 1 — Capability matrix verification + foundation copy (types, services, hooks, apiClient). Start with listing v3/v2 types and confirming with user.
- Hours: +~1h (total now ~1h)

### Session 2026-04-16 — Phase 1
- Done: 43 types (v3 verbatim, company.ts wins for 7 intelligence fields), 36 services + api/ + auth/ (v3, authService barrel fixed — v3 regression), @/ alias in tsconfig+vite, apiConfig.ts from v3, 52 hooks (v3 verbatim — useAuth/useGlobeTheme are stubs, wired in Phase 2a), shell/tokens.ts from v2 canonical. tsc → 0 errors throughout. Tag v1-phase-1.
- Broke: v3 index.ts missing authService export (fixed). useAuth/useGlobeTheme are stubs (expected, Phase 2a).
- Next: Phase 2a — AppShell + app.machine + TanStack Router URL sync.
- Hours: +~2h (total now ~3h)

### Session 2026-04-17 — Phase 2a
- Done: ADR-0001 established (Zod searchParams, auth/theme stubs, fast-deep-equal URL-sync guard, 4 parallel regions max). TanStack Router code-based wiring (router/root/workstation/index routes + Zod validateSearch). zod + fast-deep-equal installed. app.events + deriveContextFromSearchParams + app.machine (parallel: overlay[closed|person|company|vs], search, auth, focus) with top-level urlActuallyChanged guard. AppProviders (AppActor.Provider + QueryClient staleTime 30s). AppShell + RouterSync bridge (URL→machine). navigationActor real (fromCallback + router.navigate replace:true). sendTo(navRef, NAVIGATE) wired in 12 overlay transitions. Browser-validated: 5 URL→machine tests + 4 machine→URL tests all pass (incl. anti-loop via fast-deep-equal). Tag v1-phase-2a.
- Broke: Nothing material. Minor: Vite dep-cache needed clearing after install (node_modules/.vite); resolved with manual rm.
- Next: Phase 2b — EngineManager actor + engine contracts + GlobeBridge + EngineSlot.
- Hours: +~3h (total now ~6h)

### Session 2026-04-17 — Phases 1 + 2a
- Done: Phase 1 foundation (134 archivos v3 + tokens v2), Phase 2a app skeleton (URL-as-truth bidireccional, anti-loop con fast-deep-equal guard, Zod validando searchParams)
- Decisions: ADR-0001 creado con 4 reglas inmutables. Code-based routing (no file-based). Zod + fast-deep-equal instalados.
- Broke: nada crítico. index.ts de services necesitó fix de barrel export (authService), v3 había perdido el re-export.
- Next: Phase 2b (EngineManager + contracts + GlobeBridge + EngineSlot) — 4h estimadas
- Hours: ~9h acumuladas de ~40h totales (22%)

### Session 2026-04-25 — Phase 8 (ArcLayer)
- Done: Engine contracts `EngineArc` / `CMD.SET_ARCS`; `companyNetworkMapper`; `GlobeBridge` `ArcLayer` + `_arcsRevision`; `app.machine` `NETWORK_RESOLVED` + `companyArcs` + URL/enqueue clear; `engineManager` forward; `CompanyOverlayHost` dispatch; `_useService` clears data on dep change. Docs: `PHASE_8_DEBT.md`, `deck-gl-9-reference` §7 ArcLayer, closed items in `PHASE_5_DEBT` (f) + `PHASE_7_DEBT` (d). Tag `v1-phase-8`.
- Broke: (fill on manual Stage 6 matrix if any)
- Next: Phase 9 (memory/GC) or deferred Phase 7.1/7.2 per product priority.

### Session 2026-04-25 — Phase 9 (partial)
- Done: `AppShell` pagehide/beforeunload → `ENGINE.DISPOSE`; `engineManager` DISPOSE from `idle` / `initializing` / `failed`. Static listener/timer audit (see `PHASE_9.md`). `PHASE_7_DEBT` (f) cross-ref + 5-layer note in implementation notes.
- Broke: —
- Next: Run manual **GATE C** (20× heap, 60 fps with arcs) and tick Gate C in this doc when clean; optional `v1-phase-9` tag after Gate C.

### Session 2026-04-25 — Deferral + Phase 10 handoff
- Done: **Checkpoint deferral** written in `PHASE_9.md` (manual GATE C / heap is **not** blocking); `PHASE_7_DEBT` (f) points to that note. Sprint tracker: Phase 9 code log marked done; **GATE C** table column stays `[ ]` until manual run. **`.cursor/plans/phase-10-kickoff.md`** = first task order for the next etapa.
- Broke: —
- Next: **Phase 10** — open with DevTools session from `phase-10-kickoff`, then buffer / bugfix / demo polish per sprint table.

### Session 2026-04-25 — Phase 10 (integration: production build)
- Done: `npm run build` green (`tsc -b` + Vite). Person overlay: `RELATION.OPEN` carries `EntityRef`; cinematic unifies open + relation on real `cinematic` state. Company: `CompanyLogo` accepts `Company` + `CompanyIntelligence`; `FirstPanel` / `OperationsPanel` use `types/companyMarket` + optional `revenueContribution`; left-panel commodity guard; small lint fixes. `chart.js` + `react-chartjs-2` added; `src/features/company-overlay/charts/*` stub modules for TraderViewPanel until real charts land.
- Broke: —
- Next: Manual GATE C (heap/FPS) when you schedule it; then bug buffer / chunking (optional) per sprint.

---

## SESSION END UPDATE TEMPLATE

At the end of each session, append to "Session notes":

```
### Session YYYY-MM-DD — Phase N
- Done: <what was completed>
- Broke: <what didn't work / blocker>
- Next: <what to resume with>
- Hours: +Xh (total now Yh)
```

Then update:
- "Last updated" date at top of Progress Tracker
- "Current phase" and position inside it
- Checkbox if phase completed
- Gate status if crossed

Commit the updated doc: `chore(sprint): update progress — phase N`.
