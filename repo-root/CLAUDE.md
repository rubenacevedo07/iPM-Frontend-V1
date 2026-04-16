# CLAUDE.md — iPM_Frontend_V1

This file is auto-loaded by Claude Code at every session start. It contains the essential rules that apply to EVERY decision in this project. Deep references live in `docs/skills/`.

---

## PROJECT IDENTITY

**iPM_Frontend_V1** — globe-first intelligence workstation.
Status: active sprint 1 of 2 (MVP, ~40h / ~12 days).
Stack: React 19 + TypeScript strict + Vite + XState v5 + TanStack Router + TanStack Query + SCSS + DeckGL vanilla.
Backend: ASP.NET Core 8 at `https://localhost:32771` (self-signed cert).
Project port: 5178.

---

## THE SIX NON-NEGOTIABLE RULES

Every past failure of IPM frontend (v2, v3) reduces to one of these being broken. Violating any of the six = sprint dies.

1. **NO handwritten types.** Types come from `src/types/` copied verbatim from v2 or v3 (source per the capability matrix). No OpenAPI codegen either — manual discipline. If a type is missing, ASK before inventing.
2. **NO `fetch()` outside `apiClient.ts`.** Single HTTP client from v2, has token refresh and 401 handling. No parallel `apiFetch`, no inline `fetch(`, no `axios`.
3. **NO duplicate hook.** Grep `src/hooks/` before writing. If it exists, copy. If it almost exists, extend — never fork.
4. **NO refactor of copied components "because it looks weird".** Adapt only imports, never logic. `globalCompanies/`, `person-overlay/` v10, `MapCinematicIntro` → copy verbatim.
5. **NO DTOs in UI or engines.** Pipeline is strict: `services → mappers → ViewModels → EngineBridge → EngineInput`. Raw types never cross into `features/` or `engine/`.
6. **NO React inside engines.** GraphEngine uses Three.js vanilla (NOT R3F). GlobeEngine uses `new Deck({...})` (NOT `<DeckGL />`). No `import React` inside `engine/`. See `docs/engine-r3f-decision.md`.

**Enforcement heuristic:** When tempted to break any rule, the intent always sounds rational ("simpler type", "cleaner fetch", "almost the same hook", "R3F would be less code"). **The temptation IS the signal.** STOP → search v2/v3 → copy.

---

## CAPABILITY MATRIX — SOURCE OF TRUTH PER PIECE

Each piece comes from the most mature version available. Verified file-by-file during Phase 1.

| Capability | V1 uses | Source path |
|---|---|---|
| `globalCompanies/` overlay | **v2 frontend** | `frontend/src/components/globalCompanies/` |
| Person overlay (v10) + machine | **v3 IPM_Frontend** | `IPM_Frontend/src/features/person-overlay/` |
| State machines | **v3 IPM_Frontend** | `IPM_Frontend/src/machines/` + `app/app.machine.ts` |
| Services layer | **v3 IPM_Frontend** | `IPM_Frontend/src/services/` (drop nested `services/services/`) |
| Types | **v3 IPM_Frontend** | `IPM_Frontend/src/types/` (drop nested `types/types/`) |
| Hooks | **v2 frontend** | `frontend/src/hooks/` (canonical) |
| `apiClient.ts` | **v2 frontend** | `frontend/src/services/api/apiClient.ts` |
| SearchBar / SearchOverlay | **v2 frontend** | `frontend/src/components/overlays/SearchOverlay.tsx` |
| Globe cinematic + video intro | **v3 IPM_Frontend** | `IPM_Frontend/src/features/map-page/MapCinematicIntro.tsx` |
| ArcLayer | **v3 IPM_Frontend** | `IPM_Frontend/src/features/map-page/RelationArcLayer.tsx` |
| Design tokens | **v2 frontend** | `frontend/src/components/shell/tokens.ts` |

Source repos on disk:
- v2: `C:\Users\ruben\source\repos\iPM_GV\frontend\`
- v3: `C:\Users\ruben\source\repos\iPM_GV\IPM_Frontend\`
- Backend: `C:\Users\ruben\source\repos\iPM_GV\IPM_Backend\`

⚠️ frontend-v2/ existe en disco pero está DESCARTADO. No copiar, no referenciar, no importar nada de ahí. Solo v2 (frontend/) y v3 (IPM_Frontend/) son válidos.

**Duplication cleanup when copying from v3:** drop accidental nested folders `services/services/`, `hooks/hooks/`, `types/types/`. Take outer-level files only.

---

## BACKEND CONFIGURATION

Backend at `https://localhost:32771` with self-signed certificate. Three things MUST be right:

1. Vite proxy with `secure: false`:
   ```ts
   proxy: {
     '/api': {
       target: 'https://localhost:32771',
       changeOrigin: true,
       secure: false
     }
   }
   ```
2. Browser has accepted the cert manually once (`https://localhost:32771/swagger` → Advanced → Proceed).
3. `.env` uses `VITE_API_URL=/api` (proxy mode, no CORS, matches v2).

Known good endpoints (confirmed with curl):
- `GET /api/persons/7` → Elon Musk with `nodeId: "person:7"`, `photoUrl`, `countryLat/Lng`
- `GET /api/companies/1` → NVIDIA with `marketCapUsd`, `ticker`, coords
- `GET /api/persons/{id}/intelligence` → full `PersonIntelligenceDto` aggregate

---

## ARCHITECTURE — FOUR LAYERS

```
React         = layout only (AppShell, overlays, panels)
XState        = orchestration (app.machine parallel: overlay/search/auth/focus)
EngineManager = visual runtime actor; active + transitional; DOM crossfade
Engines       = render. VisualEngine contract. Three.js/DeckGL vanilla ONLY.
```

State model (4 levels):
- `NavigationState` → URL (TanStack Router search params)
- `SessionShellState` → `app.machine` context
- `WorkspaceContext` → serializable store
- `EngineEphemeralState` → inside engine, NOT global truth

Rule: if not reconstructible from URL + SessionShellState + WorkspaceContext, NOT global state.
Detail: `docs/state-model.md`.

---

## SCOPE — SPRINT 1

### IN
Video cinematic intro · Globe full-screen (DeckGL vanilla) · AppHeader · SearchOverlay · CompanyOverlay (globalCompanies verbatim) · PersonOverlay (v10 verbatim) · URL-as-state · 3 globe layers (entity dots, country risk, arcs) · EngineManager minimal.

### Globe layer budget (strict performance cap)
- **Entity dots:** ~100 total maximum
  - ~30 persons (top of `useGlobalPowerRanking`, `?limit=30`)
  - ~30 companies (top by `marketCapUsd` or `systemicImportanceLevel`)
  - ~40 chokepoints + critical facilities
- **Country risk fills:** subtle, not political-map look
  - Only countries with `RiskScore > 60` (top ~20-30 countries)
  - Rest transparent (no fill, stroke only)
  - Max opacity 0.25
  - Color ramp: amber 600 → red 800 (narrow range, no saturation)
- **Target:** sustained 60fps on rotation with all layers active (DevTools Performance)
- **Rule:** if framerate drops below 50fps, reduce dot count BEFORE adding rendering optimizations
- **Visual north star:** globe reads as "night Earth with city lights", NOT as "political map"

### OUT (sprint 2 or later)
GraphEngine + Worker · VsOverlay · CountryOverlay · CommodityOverlay · DEGRADED mode · retry/backoff · Transition Stress Harness · Landing pages · Trader module · OpenAPI codegen · ESLint architect plugin.

---

## SKILL INDEX — WHERE TO LOOK FOR DETAIL

When the task involves architectural depth beyond the rules above, Claude should open the corresponding doc:

| Topic | Read |
|---|---|
| Architecture, layer boundaries, state ownership, constitutional rules | `docs/skills/ipm-v4-core-architect.md` |
| Engine lifecycle, workers, GPU, transitions, destroy discipline | `docs/skills/ipm-engine-runtime.md` |
| Data pipeline, mappers, ViewModels, PR review | `docs/skills/ipm-data-fusion-enforcer.md` |
| V2 architectural rules (deep reference) | `docs/skills/ipm-frontend.md` |
| **Sprint progress, current phase, gates, checklists** | `docs/skills/ipm-frontend-v1-sprint.md` ← read this at every session start to resume |
| Why Three.js vanilla not R3F | `docs/engine-r3f-decision.md` |
| Four-level state model | `docs/state-model.md` |
| Capability matrix (file-level source decisions) | `docs/capability-matrix.md` |
| Sprint 2 graph engine research archive | `docs/graph-engine-research.md` |

**Priority on conflicts:** `ipm-v4-core-architect > ipm-engine-runtime > ipm-data-fusion-enforcer > ipm-frontend > ipm-frontend-v1-sprint`.

---

## SESSION START PROTOCOL

At the start of every session working on this project, Claude should:

1. Confirm this `CLAUDE.md` was loaded (if missing, stop and ask).
2. Read `docs/skills/ipm-frontend-v1-sprint.md` to find current phase and last session note.
3. If resuming mid-phase: continue the phase's checklist from where it stopped.
4. If starting a new phase: confirm the previous phase's gate passed (A/B/C) before proceeding.

---

## SESSION END PROTOCOL

Before ending a session, Claude MUST update `docs/skills/ipm-frontend-v1-sprint.md`:
1. Progress tracker — hours consumed, checkbox of phase just completed
2. Gate status if one was crossed
3. One-paragraph session note: what done, what broke, what next
4. Commit the updated doc with message `chore(sprint): update progress — phase N`

This makes next session's first action trivial.

---

## RED FLAGS — STOP AND REASSESS

- Writing an API response type by hand (Rule 1)
- Writing `fetch(` outside `apiClient.ts` (Rule 2)
- Writing a hook for something "almost the same" as existing (Rule 3)
- "Cleaning up" a copied component (Rule 4)
- Importing DTO types into `/features/` or `/engine/` (Rule 5)
- Reaching for R3F "because it would be cleaner" (Rule 6)
- Installing `openapi-typescript` (ruled out — types from v2/v3)
- Setting `secure: true` in Vite proxy (breaks on self-signed cert)
- Pasting `.env` contents anywhere
- Implementing retry/backoff/DEGRADED (sprint 2)
- Implementing Worker-based GraphEngine (sprint 2)
- 4+ hours over a phase estimate (scope creep)
- Skipping a gate to keep moving (v3 died this way)
