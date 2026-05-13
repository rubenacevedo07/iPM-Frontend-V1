// src/app/useUIState.ts
// Day 2 — thin React hook that delivers `UIState` to consumers without
// introducing a new provider. Reads `atlasView` from `app.machine` and
// `search` from TanStack Router, then derives via `selectUIState`.
//
// Kept separate from `selectUIState.ts` so the selector stays a pure module
// (no React imports) and remains trivially testable.

import { useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AppActor } from './app.machine'
import { selectUIState } from './selectUIState'
import type { UIState } from '@/types/uiState'

/**
 * Returns the current `UIState` derived from `atlasView` (machine context) and
 * the workstation URL `search` (router).
 *
 * Day 4 (lightweight promotion): memoized on the GRANULAR fields of `search`
 * that `selectUIState` actually reads. The previous Day-2 implementation
 * returned a new `UIState` reference on every render (the selector allocates
 * a fresh object), which cascaded re-renders through the 6 consumers added
 * in Day 3 every time the top-bar `query` changed — even though `query`
 * does not feed `UIState`.
 *
 * The deps list mirrors `deriveOverlay` in `selectUIState.ts` one-for-one;
 * keep them in sync if a new overlay kind ever requires a new search field.
 *
 * Full promotion to `context.uiState` is gated on criteria #1/#3/#4 from
 * `docs/strategy/day2-uistate.md § Promotion to context` — none hold today.
 */
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
    // selectUIState reads only these fields. Adding any field here without
    // touching `deriveOverlay` would be dead weight; missing one would
    // produce a stale UIState the consumers never invalidate. Granular deps
    // are intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [atlasView, overlay, id, a, b, personId, companyId, powermapId],
  )
}
