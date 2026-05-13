# Day 2 — UIState Discriminated Union (selector-first)
Date: 2026-05-13
Branch: `experiment/design-features`
Status: landed (selector + tests + AppShell adoption)

## Scope of this document

This is an ADR-light covering the Day 2 deliverable. It records:
1. The shape of `UIState`.
2. Why Day 2 ships it as a **derived selector** rather than a state machine field.
3. The criteria to consider promoting it to `app.machine` context (Day 3+).
4. The behavior preserved bit-identically and the edge cases intentionally normalized.

## Decision

**Selector-first.** Day 2 ships `UIState` as a pure derivation of `(atlasView, WorkstationSearch)` via `selectUIState(...)`. No `app.machine` change. No new event. No new context field.

## Why not directly into the machine

- `app.machine` already has a parallel structure (`overlay`, `search`, `auth`, `focus`, `atlasView`) and explicit URL handlers. Introducing a redundant `uiState` field would require keeping two sources synchronized on every transition — a regression risk for nothing visible to the user on day-of-landing.
- A selector lets every consumer migrate independently (overlay hosts, RotationGate, AtlasTabs, etc.) without coordinating a single big-bang refactor.
- Tests are trivial: the selector is a pure function over plain objects.
- If the discriminated union proves correct in practice, promotion to context (Day 3+) is mechanical: same shape, populated by `assign` actions on existing transitions.

## Shape

Defined in [src/types/uiState.ts](../../src/types/uiState.ts):

```ts
export type OverlayState =
  | { kind: 'company';  id: number }
  | { kind: 'vs';       a: number; b: number }
  | { kind: 'gold';     id: number }
  | { kind: 'hq';       personId: number; companyId: number }
  | { kind: 'powermap'; id: string }

// Transparent aliases — same shape today, can diverge in Day 3+ without
// renaming call sites.
export type GlobeOverlayState   = OverlayState
export type NetworkOverlayState = OverlayState

export type UIState =
  | { kind: 'globe-idle' }
  | { kind: 'globe-overlay';   overlay: GlobeOverlayState }
  | { kind: 'network-idle' }
  | { kind: 'network-overlay'; overlay: NetworkOverlayState }
  | { kind: 'graph-idle' }
  | { kind: 'force-idle' }
  | { kind: 'persons-idle' }
  | { kind: 'relation-idle' }
```

Naming convention:
- `<view>-idle` — the view is active and no overlay is open.
- `<view>-overlay` — the view is active with a typed overlay.
- Only `globe` and `network` host overlays in the current URL contract; the rest are view-only.

Exhaustiveness is enforced by `assertNever` in `selectUIState`. Adding a new `AtlasView` or `overlay` value in `WorkstationSearch` produces a compile error until the selector covers it.

## Derivation rules

Source of truth (no new state):
- `atlasView` from `app.machine` context.
- `WorkstationSearch.overlay` plus payload fields (`id`, `a`, `b`, `personId`, `companyId`, `powermapId`).

Rules implemented in [src/app/selectUIState.ts](../../src/app/selectUIState.ts):

1. If `atlasView` is a non-host view (`graph`, `force`, `persons`, `relation`), the selector returns `<view>-idle` regardless of overlay query string.
2. If `atlasView` is a host view (`globe`, `network`) and `search.overlay` is set with a valid payload, returns `<view>-overlay`.
3. If `atlasView` is a host view but the overlay payload is incomplete (e.g. `overlay=company` without `id`), the selector returns `<view>-idle` (defensive degradation). It never throws.

## What ships in Day 2

| Artifact | Path |
|---|---|
| Types | [src/types/uiState.ts](../../src/types/uiState.ts) |
| Pure selector | [src/app/selectUIState.ts](../../src/app/selectUIState.ts) |
| React hook | [src/app/useUIState.ts](../../src/app/useUIState.ts) |
| Tests | [src/app/selectUIState.test.ts](../../src/app/selectUIState.test.ts) |
| AppShell adoption | [src/app/AppShell.tsx](../../src/app/AppShell.tsx) (booleans now derive from `getOverlay(useUIState())`) |
| Test infra | `vitest` added to devDependencies; `npm test` script |

Test result: **45/45 pass** under `npm test -- selectUIState`.

Coverage shape:
- Idle for every `AtlasView` (6 cases).
- Valid overlay payloads on each host view (7 cases: 5 on globe + 2 on network).
- Defensive degradation on malformed URL payloads (9 cases incl. symmetric `hq` checks for both `personId` and `companyId`, and `powermap` empty/missing `powermapId`).
- Non-host views (`graph`, `force`, `persons`, `relation`) ignoring every overlay kind (20 cases: 4 views × 5 overlays).
- Helper functions (3 cases).

## Behavior preserved bit-identically

The four overlay booleans in `AppShell` (`isGoldOpen`, `isCompanyOpen`, `isHqOpen`, `isPowerMapOverlayOpen`) feed exactly two consumer sites:

- `shouldRotate` (Rule 7 invariant): outer gate is `atlasView === 'globe'`; the booleans only affect the result on globe. The selector returns the overlay for `globe-overlay` identically to the prior `search.overlay === 'X'` check, so `shouldRotate` is unchanged.
- `PowerMapsPanel` visibility: hidden when any overlay is open. The selector returns the overlay for both `globe-overlay` and `network-overlay`, matching the prior behavior (the panel renders over both views).
- The JSX render conditionals for overlay hosts (`{search.overlay === 'company' && <CompanyOverlayHost />}` etc.) were not touched — they continue to read URL directly.

## Edge case intentionally normalized

URL combinations like `atlasView=relation` plus `?overlay=company` are not produced by any normal in-app navigation flow. Under the prior code, the booleans flipped to `true` even though the relation view does not host overlays. Under the selector, that combination collapses to `relation-idle` and the booleans stay `false`.

This is a deliberate model commitment: a UIState variant only exists where the view actually hosts an overlay. Day 3 may extend host views (e.g. add overlays on `persons`) by widening `OVERLAY_HOST_VIEWS` and adding the corresponding variants.

## Out of scope (intentional)

- No changes to `app.machine` (no new context field, no new event, no new substate).
- No changes to `engineManager.machine` or any bridge.
- No URL or router contract changes.
- No migration of overlay hosts (`CompanyOverlayHost`, etc.) to `useUIState()`. They still read URL via `useSearch` until Day 3+.

## Acceptance criteria — verification

- [x] Pure selector (no React, no XState, no router imports in `selectUIState.ts`).
- [x] Exhaustive over `AtlasView` and `WorkstationSearch.overlay` (compile-time via `assertNever`).
- [x] 45 tests cover idle for every view, valid overlays on host views, defensive degradation on malformed URLs (incl. symmetric `hq` and `powermap` payload checks), and a full 4×5 matrix of non-host views ignoring every overlay kind.
- [x] `AppShell` renders identically: the four booleans are derived from the selector and feed only `shouldRotate` (gated by `atlasView === 'globe'`) and `PowerMapsPanel` visibility (covering both host views).
- [x] No new errors introduced into `npm run typecheck` attributable to Day 2 files. Pre-existing TS errors documented in [day1-profiling-baseline.md](day1-profiling-baseline.md) are still open and being fixed in a separate workstream.

## Promotion to context (Day 3 criteria)

`UIState` should be promoted from a selector to a `context.uiState` field on `app.machine` when at least one of the following becomes true:

1. **Hot path measurement**: profiling (Day 7) shows the selector running often enough that `useMemo` in `useUIState` is insufficient and per-render derivation is a visible cost.
2. **Multiple subscribers**: more than three consumer modules read `UIState`. At that point a single `useSelector(s => s.context.uiState)` is cheaper than each consumer importing `useUIState` and the selector recomputing.
3. **Transition validation**: a future invariant must reject illegal `ENGINE.SWAP` or overlay transitions based on the current `UIState` kind. The machine must "know" the kind to guard it.
4. **Persisted state**: workspace persistence (Day 6+) needs to serialize and restore the UI kind atomically with `atlasView`.

If none of those hold by Day 5, the selector stays. The fact that promotion is easy (the shape doesn't change) is itself the value of selector-first.

## Day 3+ migration backlog (informational)

- Migrate `CompanyOverlayHost`, `GoldOverlayHost`, `HeadquartersOverlayHost`, `PowerMapOverlayHost` to read overlay payload via `useUIState()` (today they read `useSearch` directly).
- Replace the four named booleans in `AppShell` with a single `switch (ui.kind)` block at the top of the component once render-site migration begins.
- Extract `shouldRotate` into a `useShouldRotate()` hook backed by `UIState` and `query` — the canonical encoding of Rule 7. Until then the existing in-file formula stays the source of truth.
