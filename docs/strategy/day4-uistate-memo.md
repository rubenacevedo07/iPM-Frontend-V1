# Day 4 — UIState stabilization (lightweight promotion)
Date: 2026-05-13
Branch: `experiment/design-features`
Status: **landed (2026-05-13)**
Preceded by: `docs/strategy/day3-plan.md`
Day 2 reference: `docs/strategy/day2-uistate.md § Promotion to context`

## Decision

**Memoize `useUIState` with granular search-param deps.** Do NOT add
`context.uiState` to `app.machine` yet.

## Why not full machine promotion

Day 2 listed four promotion criteria. Auditing them at the start of Day 4:

| # | Criterion | Status |
|---|---|---|
| 1 | Hot path measurement (profiling) | NOT MET — Day 7 profiling not yet executed |
| 2 | Multiple subscribers (>3 modules) | **MET** — 6 today (AppShell + 4 hosts + `useShouldRotate`) |
| 3 | Transition validation (machine must guard on `ui.kind`) | NOT MET — no new invariant requires it |
| 4 | Persisted state (workspace) | NOT MET — Day 6+ |

Only #2 holds. Promotion to `context.uiState` is non-trivial:

- `app.machine` has 5 parallel regions; the `overlay` region alone has 6
  substates each with 4-5 transitions. Storing `uiState` in context means
  recomputing it via a shared helper on every transition that touches
  `atlasView`, `overlayId`, `overlayIdB`, or `powermapId` (≥ 12 assigns).
- The `URL_CHANGED` handler at the top level already uses `enqueueActions`
  for arcs management; layering uiState recomputation here adds complexity.
- Drift risk: any future `assign` that mutates one of those fields without
  invoking the helper leaves `uiState` stale. There is no compile-time
  enforcement of "you must recompute uiState whenever X changes".

The actual benefit #2 promises — stable reference for `ui` across renders
that don't change the UI configuration — can be captured at the hook layer
with `useMemo` + granular deps. That is the change Day 4 ships.

## Shape of the change

[src/app/useUIState.ts](../../src/app/useUIState.ts):

```ts
export function useUIState(): UIState {
  const atlasView  = AppActor.useSelector(s => s.context.atlasView)
  const search     = useSearch({ from: '/workstation' })
  const overlay    = search.overlay
  const id         = search.id
  const a          = search.a
  const b          = search.b
  const personId   = search.personId
  const companyId  = search.companyId
  const powermapId = search.powermapId
  return useMemo(
    () => selectUIState({ atlasView, search }),
    [atlasView, overlay, id, a, b, personId, companyId, powermapId],
  )
}
```

Deps mirror `deriveOverlay` in `selectUIState.ts` one-for-one. The exhaustive
test matrix for `selectUIState` (45 cases) already covers every combination
of these inputs; no new behavioural test is required for the hook itself.

## What this fixes

Before Day 4, every render of any of the 6 consumers reallocated a fresh
`UIState` object. Concretely:

1. User types in the top-bar search input → `query` changes → `useShouldRotate`
   recomputes (correct) → AppShell re-renders → `useUIState()` returns a new
   `UIState` reference even though `(atlasView, overlay, id, ...)` are
   identical → each consumer's render hook detects a "change" via Object.is
   → consumer re-renders unnecessarily.
2. `getOverlay(useUIState())` in AppShell produced a new `overlay` reference
   on every render; the `AnimatePresence` predicates re-evaluated against a
   different reference each time. Predicates were value-stable so framer
   stayed quiet, but the work was repeated.

After Day 4, `useUIState()` returns the SAME reference across renders until
one of the granular deps changes. Consumers see Object.is stability.

## What this does NOT fix

- The selector itself recomputes per consumer when one of its deps DOES
  change. If profiling later shows the selector cost is the bottleneck
  (criterion #1), promote to context so the selector runs once per
  transition rather than once per consumer.
- Stale UIState risk only exists in the machine-context world; the
  selector-first world simply has no stale state — it derives on demand.

## Acceptance criteria — verified

- [x] `npm run typecheck` → 0 errors.
- [x] `npm test` → 68/68 (45 selectUIState + 23 useShouldRotate, unchanged).
- [x] `useUIState` returns memoized references; granular deps mirror the
      fields read inside `selectUIState.deriveOverlay`.
- [x] No change to `app.machine`, `selectUIState`, or any consumer.

## Open follow-ups (re-validated)

- **Manual smoke** for Day 3 fixes (picking + arcs + overlay migration) —
  still pending user validation.
- **Day 7 profiling** — gates a possible full promotion later.
- **Router chunk code-split** (Perf Step 5) — independent track.
- **CSS regression #3** — awaiting pantalla concreta.

## Notes for whoever revisits this

If a future task needs `uiState.kind` inside a machine guard or in
`enqueueActions`, do NOT add a new selector at the call site. That is the
signal that criterion #3 has flipped to MET and the full promotion is
finally worth the blast radius. The migration is mechanical at that point:
add `context.uiState`, write a `deriveUIStateFromContextAndSearch` helper,
invoke it in every assign that touches the underlying fields, and replace
each `useUIState()` call site with `AppActor.useSelector(s => s.context.uiState)`.
