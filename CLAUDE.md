## Skill hierarchy (load by reading docs/skills/*)
When working on architecture → read docs/skills/ipm-v4-core-architect.md
When working on engines/runtime → read docs/skills/ipm-engine-runtime.md
When working on data pipeline → read docs/skills/ipm-data-fusion-enforcer.md
When resuming the sprint → read docs/skills/ipm-frontend-v1-sprint.md
Architectural rules → read docs/skills/ipm-frontend.md

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