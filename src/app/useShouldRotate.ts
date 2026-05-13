// src/app/useShouldRotate.ts
// Day 3 — single rotation-decision site for the globe engine.
//
// Rule 7 (locked, see CLAUDE.md):
//   Rotation MUST be disabled whenever ANY of:
//     - atlasView is not 'globe' (user is on network/persons/relation/etc.),
//     - any overlay is open on globe or network (company/gold/hq/vs/powermap),
//     - a power-map theme is active via the search query (legacy: top-bar
//       quick toggle that does not yet go through the URL overlay contract).
//
// This hook replaces the inline conjunction previously declared in AppShell
// (`atlasView === 'globe' && !activePowermapId && !isGoldOpen && ...`). The
// conjunction is preserved bit-for-bit by `computeShouldRotate`; the hook is
// merely the React-side plumbing that subscribes to the actor and the
// derived UIState.

import { useMemo } from 'react'
import { AppActor } from './app.machine'
import { SEARCH_THEMES, type SearchTheme } from '@/components/TopBar/searchThemes'
import { useUIState } from './useUIState'
import type { UIState } from '@/types/uiState'

/**
 * Pure helper. Same input → same output. Memoizable and trivially testable
 * without an XState actor. Exported so `useShouldRotate.test.ts` can exercise
 * the full truth table without mounting a React tree.
 *
 * @param ui     current UIState (typically from `useUIState()`)
 * @param query  raw value of `context.query` (top-bar search input)
 * @param themes power-map themes (defaults to the production list; tests pass
 *               a minimal stub to keep the assertions self-contained)
 */
export function computeShouldRotate(
  ui:     UIState,
  query:  string,
  themes: ReadonlyArray<SearchTheme> = SEARCH_THEMES,
): boolean {
  // `globe-idle` is the ONLY UIState where the globe is the visible, non-
  // overlaid surface. Every other variant either hides the globe behind a
  // different view (network/persons/relation/graph/force) or floats an
  // overlay over it. Rule 7 demands rotation off in all of them.
  if (ui.kind !== 'globe-idle') return false

  // A power-map is "active" via the legacy top-bar quick toggle when the
  // trimmed, case-folded query matches a theme label. This path predates the
  // URL overlay contract; while it lives, treat it as an overlay-equivalent
  // gate. Moving it to URL is a Day 5+ concern (`day3-plan.md` § Out of scope).
  const q = query.trim().toLowerCase()
  if (q.length === 0) return true
  const activePowermap = themes.find(t => t.label.toLowerCase() === q)
  return !activePowermap
}

/**
 * React hook wrapper. Reads `query` from `app.machine` context and `ui` from
 * `useUIState()`, then delegates to `computeShouldRotate`. The `useMemo`
 * caches on the discriminator + query so the SEARCH_THEMES scan only runs
 * when one of those actually changes — `useUIState()` returns a new object
 * reference each call, so memoizing on `ui` directly would defeat the cache.
 */
export function useShouldRotate(): boolean {
  const query = AppActor.useSelector(s => s.context.query)
  const ui    = useUIState()
  return useMemo(
    () => computeShouldRotate(ui, query),
    [ui.kind, query],
  )
}
