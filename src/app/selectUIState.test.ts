// src/app/selectUIState.test.ts
// Day 2 — exhaustive matrix tests for `selectUIState`.
//
// Coverage goals (acceptance criterion in docs/strategy/day2-uistate.md):
//   1. Every `AtlasView` × {no-overlay, each overlay kind} pair maps to a
//      defined `UIState` variant.
//   2. Overlay-host views (`globe`, `network`) produce `*-overlay` only when
//      the URL payload is valid; otherwise degrade to `*-idle`.
//   3. Non-overlay-host views (`graph`, `force`, `persons`, `relation`) IGNORE
//      `search.overlay` and always produce `*-idle`.
//   4. Defensive degradation on malformed URLs never throws.

import { describe, it, expect } from 'vitest'
import { selectUIState, isOverlayOpen, getOverlay } from './selectUIState'
import type { AtlasView } from '@/types/atlas'
import type { WorkstationSearch } from '@/routes/workstation'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ALL_VIEWS: AtlasView[] = ['globe', 'network', 'graph', 'force', 'persons', 'relation']

const EMPTY: WorkstationSearch = {}

function withOverlay(s: Partial<WorkstationSearch>): WorkstationSearch {
  return s
}

// ---------------------------------------------------------------------------
// Idle: every view with no overlay
// ---------------------------------------------------------------------------

describe('selectUIState — idle (no overlay)', () => {
  it.each(ALL_VIEWS)('view=%s with empty search → <view>-idle', (view) => {
    const ui = selectUIState({ atlasView: view, search: EMPTY })
    expect(ui.kind).toBe(`${view}-idle`)
    expect(isOverlayOpen(ui)).toBe(false)
    expect(getOverlay(ui)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Overlay-host views: globe + network with each valid overlay
// ---------------------------------------------------------------------------

describe('selectUIState — globe-overlay (valid payloads)', () => {
  it('company → globe-overlay { company, id }', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'company', id: 42 }),
    })
    expect(ui).toEqual({ kind: 'globe-overlay', overlay: { kind: 'company', id: 42 } })
  })

  it('gold → globe-overlay { gold, id }', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'gold', id: 7 }),
    })
    expect(ui).toEqual({ kind: 'globe-overlay', overlay: { kind: 'gold', id: 7 } })
  })

  it('vs → globe-overlay { vs, a, b }', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'vs', a: 1, b: 2 }),
    })
    expect(ui).toEqual({ kind: 'globe-overlay', overlay: { kind: 'vs', a: 1, b: 2 } })
  })

  it('hq → globe-overlay { hq, personId, companyId }', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'hq', personId: 7, companyId: 9 }),
    })
    expect(ui).toEqual({
      kind: 'globe-overlay',
      overlay: { kind: 'hq', personId: 7, companyId: 9 },
    })
  })

  it('powermap → globe-overlay { powermap, id }', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'powermap', powermapId: 'china-ai' }),
    })
    expect(ui).toEqual({
      kind: 'globe-overlay',
      overlay: { kind: 'powermap', id: 'china-ai' },
    })
  })
})

describe('selectUIState — network-overlay (valid payloads)', () => {
  it('company on network → network-overlay', () => {
    const ui = selectUIState({
      atlasView: 'network',
      search: withOverlay({ overlay: 'company', id: 1 }),
    })
    expect(ui).toEqual({ kind: 'network-overlay', overlay: { kind: 'company', id: 1 } })
  })

  it('vs on network → network-overlay', () => {
    const ui = selectUIState({
      atlasView: 'network',
      search: withOverlay({ overlay: 'vs', a: 3, b: 4 }),
    })
    expect(ui).toEqual({ kind: 'network-overlay', overlay: { kind: 'vs', a: 3, b: 4 } })
  })
})

// ---------------------------------------------------------------------------
// Defensive degradation — malformed URL payloads
// ---------------------------------------------------------------------------

describe('selectUIState — defensive degradation', () => {
  it('overlay=company without id → globe-idle', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'company' }),
    })
    expect(ui.kind).toBe('globe-idle')
  })

  it('overlay=gold without id → globe-idle', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'gold' }),
    })
    expect(ui.kind).toBe('globe-idle')
  })

  it('overlay=vs with only a → globe-idle', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'vs', a: 1 }),
    })
    expect(ui.kind).toBe('globe-idle')
  })

  it('overlay=hq without companyId → globe-idle', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'hq', personId: 7 }),
    })
    expect(ui.kind).toBe('globe-idle')
  })

  it('overlay=hq without personId → globe-idle', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'hq', companyId: 9 }),
    })
    expect(ui.kind).toBe('globe-idle')
  })

  it('overlay=hq without either id → globe-idle', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'hq' }),
    })
    expect(ui.kind).toBe('globe-idle')
  })

  it('overlay=powermap without powermapId → globe-idle', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'powermap' }),
    })
    expect(ui.kind).toBe('globe-idle')
  })

  it('overlay=powermap with empty powermapId → globe-idle', () => {
    const ui = selectUIState({
      atlasView: 'globe',
      search: withOverlay({ overlay: 'powermap', powermapId: '' }),
    })
    expect(ui.kind).toBe('globe-idle')
  })

  it('overlay on network with malformed payload → network-idle', () => {
    const ui = selectUIState({
      atlasView: 'network',
      search: withOverlay({ overlay: 'company' }),
    })
    expect(ui.kind).toBe('network-idle')
  })
})

// ---------------------------------------------------------------------------
// Non-overlay-host views must ignore overlay params (full matrix)
// ---------------------------------------------------------------------------
//
// Every non-host view × every valid overlay payload must collapse to
// `<view>-idle`. This is the most likely source of regressions if Day 3+
// extends `OVERLAY_HOST_VIEWS`: forgetting to add a `<view>-overlay` variant
// for a newly promoted host view would silently fall through to idle here.

describe('selectUIState — overlay ignored on non-host views (full matrix)', () => {
  const NON_HOST: AtlasView[] = ['graph', 'force', 'persons', 'relation']

  type OverlayCase = { label: string; search: WorkstationSearch }
  const VALID_OVERLAYS: OverlayCase[] = [
    { label: 'company',  search: { overlay: 'company',  id: 1 } },
    { label: 'gold',     search: { overlay: 'gold',     id: 7 } },
    { label: 'vs',       search: { overlay: 'vs',       a: 1, b: 2 } },
    { label: 'hq',       search: { overlay: 'hq',       personId: 7, companyId: 9 } },
    { label: 'powermap', search: { overlay: 'powermap', powermapId: 'china-ai' } },
  ]

  for (const view of NON_HOST) {
    for (const { label, search } of VALID_OVERLAYS) {
      it(`view=${view} + overlay=${label} → ${view}-idle`, () => {
        const ui = selectUIState({ atlasView: view, search })
        expect(ui.kind).toBe(`${view}-idle`)
        expect(isOverlayOpen(ui)).toBe(false)
        expect(getOverlay(ui)).toBeNull()
      })
    }
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe('selectUIState — helpers', () => {
  it('isOverlayOpen returns true only for *-overlay variants', () => {
    const open = selectUIState({
      atlasView: 'globe',
      search: { overlay: 'company', id: 1 },
    })
    expect(isOverlayOpen(open)).toBe(true)

    const idle = selectUIState({ atlasView: 'globe', search: {} })
    expect(isOverlayOpen(idle)).toBe(false)
  })

  it('getOverlay returns the overlay payload when present', () => {
    const ui = selectUIState({
      atlasView: 'network',
      search: { overlay: 'vs', a: 5, b: 6 },
    })
    expect(getOverlay(ui)).toEqual({ kind: 'vs', a: 5, b: 6 })
  })

  it('getOverlay returns null on idle variants', () => {
    expect(getOverlay({ kind: 'globe-idle' })).toBeNull()
    expect(getOverlay({ kind: 'graph-idle' })).toBeNull()
  })
})
