// src/app/selectUIState.ts
// Day 2 — pure selector mapping (atlasView, WorkstationSearch) → UIState.
//
// Rules (locked in docs/strategy/day2-uistate.md):
//   - Pure function. No XState. No router. No React.
//   - Does NOT introduce new state — only re-shapes what already exists.
//   - On invalid overlay payload (missing required ids), degrades to *-idle
//     instead of throwing. URL is user-controllable; defense is in this layer
//     so consumers can branch with confidence.
//   - Exhaustive over `AtlasView` and `WorkstationSearch.overlay` via
//     `assertNever`. Adding a new view or overlay kind is a compile error
//     until handled.

import type { AtlasView } from '@/types/atlas'
import type { WorkstationSearch } from '@/routes/workstation'
import type { OverlayState, UIState } from '@/types/uiState'
import { assertNever, isOverlayHostView } from '@/types/uiState'

export interface UIStateInput {
  atlasView: AtlasView
  search:    WorkstationSearch
}

/**
 * Build an `OverlayState` from URL search params, or `null` if the payload is
 * not internally consistent (e.g. `overlay=company` without an `id`).
 *
 * Returning `null` lets the caller degrade the UIState to `<view>-idle` rather
 * than crash on a user-typed URL.
 */
function deriveOverlay(search: WorkstationSearch): OverlayState | null {
  const overlay = search.overlay
  if (!overlay) return null

  switch (overlay) {
    case 'company': {
      if (typeof search.id !== 'number') return null
      return { kind: 'company', id: search.id }
    }
    case 'gold': {
      if (typeof search.id !== 'number') return null
      return { kind: 'gold', id: search.id }
    }
    case 'vs': {
      if (typeof search.a !== 'number' || typeof search.b !== 'number') return null
      return { kind: 'vs', a: search.a, b: search.b }
    }
    case 'hq': {
      if (typeof search.personId !== 'number' || typeof search.companyId !== 'number') return null
      return { kind: 'hq', personId: search.personId, companyId: search.companyId }
    }
    case 'powermap': {
      if (typeof search.powermapId !== 'string' || search.powermapId.length === 0) return null
      return { kind: 'powermap', id: search.powermapId }
    }
    default:
      return assertNever(overlay)
  }
}

/**
 * Map the current (atlasView, search) to a single `UIState` variant. Pure;
 * call it from `useUIState()` or from tests directly.
 */
export function selectUIState(input: UIStateInput): UIState {
  const { atlasView, search } = input

  switch (atlasView) {
    case 'globe': {
      const overlay = deriveOverlay(search)
      return overlay
        ? { kind: 'globe-overlay', overlay }
        : { kind: 'globe-idle' }
    }
    case 'network': {
      const overlay = deriveOverlay(search)
      return overlay
        ? { kind: 'network-overlay', overlay }
        : { kind: 'network-idle' }
    }
    case 'graph':
      return { kind: 'graph-idle' }
    case 'force':
      return { kind: 'force-idle' }
    case 'persons':
      return { kind: 'persons-idle' }
    case 'relation':
      return { kind: 'relation-idle' }
    default:
      return assertNever(atlasView)
  }
}

/**
 * Narrowing helpers — small enough to inline but useful when a consumer wants
 * a boolean rather than a switch. Keep this surface minimal; the canonical
 * branch pattern is `switch (ui.kind)`.
 */
export function isOverlayOpen(ui: UIState): boolean {
  return ui.kind === 'globe-overlay' || ui.kind === 'network-overlay'
}

export function getOverlay(ui: UIState): OverlayState | null {
  return ui.kind === 'globe-overlay' || ui.kind === 'network-overlay'
    ? ui.overlay
    : null
}

export { isOverlayHostView }
