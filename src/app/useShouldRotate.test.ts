// src/app/useShouldRotate.test.ts
// Day 3 — truth table for `computeShouldRotate`, the pure helper behind
// `useShouldRotate()`. Rule 7 (rotation off whenever any selection / view
// switch / power-map is active) is enforced exclusively here; this file is
// the only automated guarantee of that invariant.
//
// We test the pure helper, not the React hook, so the matrix runs without
// mounting an actor. The hook is a one-liner that delegates to the helper
// via `useMemo`; if the helper is correct and `useUIState()` is correct
// (covered in selectUIState.test.ts), the hook is correct.

import { describe, it, expect } from 'vitest'
import { computeShouldRotate } from './useShouldRotate'
import type { UIState } from '@/types/uiState'
import type { SearchTheme } from '@/components/TopBar/searchThemes'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const THEMES: ReadonlyArray<SearchTheme> = [
  { id: 'wall-street', label: 'Wall Street', subtitle: '', category: 'Power Map', accent: '#000' },
  { id: 'ai-power-map', label: 'AI Power Map', subtitle: '', category: 'AI',        accent: '#000' },
]

const IDLES: ReadonlyArray<UIState> = [
  { kind: 'globe-idle' },
  { kind: 'network-idle' },
  { kind: 'graph-idle' },
  { kind: 'force-idle' },
  { kind: 'persons-idle' },
  { kind: 'relation-idle' },
]

const GLOBE_OVERLAYS: ReadonlyArray<UIState> = [
  { kind: 'globe-overlay', overlay: { kind: 'company',  id: 1 } },
  { kind: 'globe-overlay', overlay: { kind: 'gold',     id: 1 } },
  { kind: 'globe-overlay', overlay: { kind: 'hq',       personId: 1, companyId: 2 } },
  { kind: 'globe-overlay', overlay: { kind: 'vs',       a: 1, b: 2 } },
  { kind: 'globe-overlay', overlay: { kind: 'powermap', id: 'wall-street' } },
]

const NETWORK_OVERLAYS: ReadonlyArray<UIState> = [
  { kind: 'network-overlay', overlay: { kind: 'company',  id: 1 } },
  { kind: 'network-overlay', overlay: { kind: 'powermap', id: 'wall-street' } },
]

// ---------------------------------------------------------------------------
// Rotation ON: globe-idle, no power-map query
// ---------------------------------------------------------------------------

describe('computeShouldRotate — rotation ON', () => {
  it('globe-idle + empty query → true', () => {
    expect(computeShouldRotate({ kind: 'globe-idle' }, '', THEMES)).toBe(true)
  })

  it('globe-idle + whitespace-only query → true (trimmed empty)', () => {
    expect(computeShouldRotate({ kind: 'globe-idle' }, '   \t  ', THEMES)).toBe(true)
  })

  it('globe-idle + freeform query (not a theme label) → true', () => {
    expect(computeShouldRotate({ kind: 'globe-idle' }, 'apple', THEMES)).toBe(true)
  })

  it('globe-idle + query similar to but not equal to a theme → true', () => {
    // "Wall Streets" (with plural) must not match the "Wall Street" theme.
    expect(computeShouldRotate({ kind: 'globe-idle' }, 'wall streets', THEMES)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Rotation OFF: power-map theme query
// ---------------------------------------------------------------------------

describe('computeShouldRotate — rotation OFF via power-map query', () => {
  it('globe-idle + exact theme label → false', () => {
    expect(computeShouldRotate({ kind: 'globe-idle' }, 'Wall Street', THEMES)).toBe(false)
  })

  it('globe-idle + theme label different case → false', () => {
    expect(computeShouldRotate({ kind: 'globe-idle' }, 'WALL STREET', THEMES)).toBe(false)
  })

  it('globe-idle + theme label with surrounding whitespace → false', () => {
    expect(computeShouldRotate({ kind: 'globe-idle' }, '  ai power map  ', THEMES)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Rotation OFF: any overlay open on globe (Rule 7)
// ---------------------------------------------------------------------------

describe('computeShouldRotate — rotation OFF when overlay open on globe', () => {
  it.each(GLOBE_OVERLAYS)('$kind / overlay=$overlay.kind → false', (ui) => {
    expect(computeShouldRotate(ui, '', THEMES)).toBe(false)
  })

  it('globe-overlay + freeform query → still false (overlay dominates)', () => {
    const ui: UIState = { kind: 'globe-overlay', overlay: { kind: 'company', id: 42 } }
    expect(computeShouldRotate(ui, 'apple', THEMES)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Rotation OFF: non-globe views (Rule 7 — view-switch)
// ---------------------------------------------------------------------------

describe('computeShouldRotate — rotation OFF on non-globe-idle views', () => {
  it.each(IDLES.filter(u => u.kind !== 'globe-idle'))('$kind → false', (ui) => {
    expect(computeShouldRotate(ui, '', THEMES)).toBe(false)
  })

  it.each(NETWORK_OVERLAYS)('network-overlay / overlay=$overlay.kind → false', (ui) => {
    expect(computeShouldRotate(ui, '', THEMES)).toBe(false)
  })

  it('persons-idle + theme query → still false (view-switch dominates)', () => {
    expect(computeShouldRotate({ kind: 'persons-idle' }, 'Wall Street', THEMES)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Default theme list — sanity check that the prod constant is wired
// ---------------------------------------------------------------------------

describe('computeShouldRotate — default themes parameter', () => {
  it('globe-idle + empty query without themes arg → true', () => {
    expect(computeShouldRotate({ kind: 'globe-idle' }, '')).toBe(true)
  })

  it('globe-idle + a real production theme label without themes arg → false', () => {
    // 'Wall Street' is present in SEARCH_THEMES (src/components/TopBar/searchThemes.ts).
    expect(computeShouldRotate({ kind: 'globe-idle' }, 'Wall Street')).toBe(false)
  })
})
