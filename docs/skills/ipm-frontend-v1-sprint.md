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
| 7 | Globe layers (real data) | 4h | 9 | Entity dots + country risk + click handlers |
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

---

## PROGRESS TRACKER (LIVE STATE)

**Last updated:** 2026-04-16
**Current phase:** Phase 1 (Phase 0 complete)
**Phases complete:** 1 / 11
**Hours consumed:** ~1h / 40h 30min
**Gates passed:** A [ ] B [ ] C [ ]

### Phase log
- [x] Phase 0 — Pre-flight + env + operational docs — ~1h / 2h 30min
- [ ] Phase 1 — Capability matrix + foundation copy — __h / 5h
- [ ] Phase 2a — AppShell + app.machine — __h / 4h
- [ ] Phase 2b — EngineManager contracts — __h / 4h
- [ ] Phase 3 — GlobeEngine + Video intro — __h / 4h → **GATE A**
- [ ] Phase 4 — AppHeader + SearchOverlay — __h / 3h
- [ ] Phase 5 — Company overlay — __h / 4h
- [ ] Phase 6 — Person overlay — __h / 4h → **GATE B**
- [ ] Phase 7 — Globe layers — __h / 4h
- [ ] Phase 8 — ArcLayer — __h / 3h
- [ ] Phase 9 — Polish + leak audit — __h / 3h → **GATE C**
- [ ] Phase 10 — Integration + buffer — __h / 4h

### Session notes

### Session 2026-04-16 — Phase 0
- Done: Vite scaffold (react-ts), dependencies installed (xstate, @xstate/react, @tanstack/react-query, @tanstack/react-router, sass), vite.config.ts with port 5178 + proxy secure:false, .gitignore full, git init, all operational docs verified in place, .github/PULL_REQUEST_TEMPLATE.md created. tsc → 0 errors. Proxy test → Elon Musk JSON via http://localhost:5178/api/persons/7.
- Broke: Nothing.
- Next: Phase 1 — Capability matrix verification + foundation copy (types, services, hooks, apiClient). Start with listing v3/v2 types and confirming with user.
- Hours: +~1h (total now ~1h)

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
