// src/types/uiState.ts
// Day 2 — discriminated union over the current dispersed UI state
// (atlasView + WorkstationSearch overlay params). Pure types; no runtime deps.
//
// Design: derived, not stored. See docs/strategy/day2-uistate.md for the
// rationale on selector-first vs context-resident UIState.
//
// Source of truth per kind:
//   - atlasView         → top-level "view" axis
//   - search.overlay    → overlay kind on top of view
//   - search.id/a/b/... → overlay payload
//   - search.powermapId → powermap overlay payload
//
// Exhaustiveness is enforced via `assertNever` in `selectUIState`. Adding a new
// `AtlasView` value or a new `overlay` URL value WILL cause a compile error in
// the selector until the new case is handled.

import type { AtlasView } from './atlas'

/**
 * Canonical overlay states. Each variant carries exactly the parameters
 * required to render the corresponding overlay.
 *
 * Today the same set is valid on `globe` and `network`; `GlobeOverlayState`
 * and `NetworkOverlayState` are transparent aliases over this type. Day 3+
 * can split them without renaming call sites: just replace the alias on
 * either side with its own union and re-export.
 */
export type OverlayState =
  | { kind: 'company';  id: number }
  | { kind: 'vs';       a: number; b: number }
  | { kind: 'gold';     id: number }
  | { kind: 'hq';       personId: number; companyId: number }
  | { kind: 'powermap'; id: string }

/**
 * Overlay states allowed on top of the globe view. Today identical to
 * `OverlayState`; kept as a named alias so consumers can branch on a stable
 * symbol even if the set diverges from network in the future.
 */
export type GlobeOverlayState = OverlayState

/**
 * Overlay states allowed on top of the network view. Today identical to
 * `OverlayState`; kept as a named alias so divergence is a one-line edit.
 */
export type NetworkOverlayState = OverlayState

/**
 * Discriminated union describing the meaningful UI configurations of the
 * workstation at a given instant. Day 2 derives this from existing state;
 * Day 3+ may promote it to `app.machine` context.
 *
 * Naming convention:
 *   `<view>-idle`    — view active, no overlay
 *   `<view>-overlay` — view active with a typed overlay
 *
 * Currently only `globe` and `network` support overlays in the URL contract.
 * `graph`, `force`, `persons`, `relation` are view-only.
 */
export type UIState =
  | { kind: 'globe-idle' }
  | { kind: 'globe-overlay';   overlay: GlobeOverlayState }
  | { kind: 'network-idle' }
  | { kind: 'network-overlay'; overlay: NetworkOverlayState }
  | { kind: 'graph-idle' }
  | { kind: 'force-idle' }
  | { kind: 'persons-idle' }
  | { kind: 'relation-idle' }

/**
 * The set of `AtlasView` values that may host an overlay in the current URL
 * contract. Used by the selector; isolated here so adding a new overlay-host
 * view (e.g. `'persons'`) is a single edit.
 */
export const OVERLAY_HOST_VIEWS = ['globe', 'network'] as const
export type OverlayHostView = (typeof OVERLAY_HOST_VIEWS)[number]

export function isOverlayHostView(view: AtlasView): view is OverlayHostView {
  return (OVERLAY_HOST_VIEWS as readonly AtlasView[]).includes(view)
}

/**
 * Compile-time exhaustiveness helper. Used at the default branch of switches
 * that must cover every variant. If a variant is added and not handled, TS
 * will fail with "Argument of type 'X' is not assignable to type 'never'".
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated variant: ${JSON.stringify(value)}`)
}
