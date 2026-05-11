## Skill hierarchy (load by reading docs/skills/*)
When working on architecture → read docs/skills/ipm-v4-core-architect.md
When working on engines/runtime → read docs/skills/ipm-engine-runtime.md
When working on data pipeline → read docs/skills/ipm-data-fusion-enforcer.md
When resuming the sprint → read docs/skills/ipm-frontend-v1-sprint.md
Architectural rules → read docs/skills/ipm-frontend.md
When touching GlobeBridge / deck.gl auto-rotation / viewState / wheel-zoom issues → read docs/skills/deck-gl-globe-rotation.md

## The six non-negotiable rules
1. NO handwritten types...
2. NO fetch() outside apiClient.ts...
(las 6 reglas inline aquí, para que estén siempre en contexto)

---

## ARCHITECTURAL DECISION RECORDS (sprint 1)

Certain decisions for Phase 2a and beyond are frozen to prevent architectural drift. See:

- **`docs/adr-0001-phase-2a-constraints.md`** — Zod for searchParams, useAuth/useGlobeTheme as stubs, same-context no-op guard for URL sync, app.machine shape (4 flat parallel regions max)

Before proposing ANY work on AppShell, app.machine, routing, auth, or theme, Claude MUST read this ADR. Proposals that violate any decision in ADR-0001 must be refused with a pointer to the specific decision.

---

## RED FLAGS — STOP AND REASSESS

- Implementing real `useAuth` or `AuthContext` during sprint 1 (ADR-0001 Decision 2)
- Implementing theme switcher or real `useGlobeTheme` during sprint 1 (ADR-0001 Decision 2)
- Using `ignoreNextUrlChange`, refs, or flags for URL sync (ADR-0001 Decision 3)
- Adding states beyond the 4 flat parallel regions in app.machine during sprint 1 (ADR-0001 Decision 4)
- Validating searchParams without Zod when a Zod schema would work (ADR-0001 Decision 1)
- **Modifying `shouldRotate` in AppShell.tsx to re-enable rotation while a powermap or overlay is active** — this breaks Rule 7 (user-requested invariant, must not be silently reverted)
- Sending `CMD.SET_ROTATION enabled: true` while `activePowermapId !== null` or any overlay is open

---

## Current sprint phase
Read docs/skills/ipm-frontend-v1-sprint.md for the live progress tracker.

### Globe layer budget (strict)
- Entity dots: ~100 total (30 persons + 30 companies + 40 chokepoints/facilities)
- Country risk fills: ONLY countries with RiskScore > 60
- Country fill opacity: max 0.25 (subtle, not political-map look)
- Target: sustained 60fps on rotation with all layers active
- If framerate drops below 50fps, reduce dot count before adding layer optimization


## Technical stack conventions

- Routing: TanStack Router **code-based** (manual `createRoute` + `rootRoute.addChildren`)
- No file-based plugin installed — do NOT use `createFileRoute` API
- Route files: `src/routes/{router.ts, __root.tsx, index.tsx, workstation.tsx}`
- Each new route: add to `router.ts`'s `routeTree` chain explicitly


## Non-negotiable rules (sprint 1, frozen until v1-phase-5)

### Rule 1 — NO handwritten types
Use only types from `src/types/` (v3 verbatim, 43 files). Any new type 
inference happens at the service/contract boundary — never in components.
If a type seems missing, search v3 first. Last resort: add to 
`src/types/_ext/` with justification in the commit message.

### Rule 2 — NO fetch() outside apiClient.ts  
Services layer is the single network egress point. All HTTP goes through 
`apiClient.ts`. No `fetch`, no `axios`, no direct `new Request()` anywhere 
in `features/`, `components/`, or machines.

### Rule 3 — NO router.navigate() from components
URL mutations go through `navigationActor` only (single-writer pattern). 
Components `send()` events to the actor; the actor owns `router.navigate`. 
This makes URL the derived state of machine state, not the source.

### Rule 4 — NO DTOs in features/engine
Contracts in `engine/contracts/` are pure: no wire format, no API shape. 
Mappers live at the service boundary. Engine never knows the server exists.

### Rule 5 — NO R3F (React Three Fiber)
DeckGL imperative only: `new Deck({...})`, `deck.setProps()`, manual 
lifecycle. No `<DeckGL />` JSX, no reconciler. This applies to all future 
3D/canvas engines too — the engine layer owns its own render loop.

### Rule 6 — NO refactor of v3-copied code
v3 code ships verbatim. Corrections documented case-by-case in commit 
messages with rationale. Refactoring window opens post-sprint-1 (tag 
v1-phase-5 or later).

### Rule 7 — Globe stops rotating when any target is selected (USER INVARIANT)
When ANY of the following is active, `CMD.SET_ROTATION` MUST be sent with `enabled: false`:
- A PowerMap is selected (`activePowermapId !== null`)
- Any overlay is open: person, company, gold, or any future overlay type

The canonical gate in `src/app/AppShell.tsx` is:
```
const shouldRotate = !activePowermapId && !isGoldOpen && !isPersonOpen && search.overlay !== 'company'
```
Do NOT add exceptions. Do NOT add conditions that re-enable rotation while a target is
selected. Do NOT modify this formula without explicit written approval from the user.

**Why:** after the cinematic fly-to, the globe must remain centered on the selected entity.
A rotating globe drifts the target out of view. The user has explicitly requested this as a
permanent, non-negotiable invariant.