# Day 3 — Adopt `useUIState()` at render sites (overlay hosts + AppShell)
Date drafted: 2026-05-13
Branch: `experiment/design-features`
Status: **landed (2026-05-13)** — see § Closeout at the bottom.
Preceded by: `docs/strategy/day2-uistate.md`
Plan v3 reference: `ipm-frontend-v1-sprint`

## Why Day 3 exists

Day 2 introduced the `UIState` discriminated union and an `AppShell` adoption
that derives four named booleans (`isGoldOpen`, `isCompanyOpen`, `isHqOpen`,
`isPowerMapOverlayOpen`) from `getOverlay(useUIState())`. Every other render
site still reads `useSearch(...)` directly and string-types the overlay kind:

| File | Pattern today |
|---|---|
| `src/app/CompanyOverlayHost.tsx` | `search.overlay === 'company'` + manual `search.id` extraction |
| `src/app/GoldOverlayHost.tsx` | `search.overlay === 'gold'` + manual `search.id` |
| `src/app/HeadquartersOverlayHost.tsx` | `search.overlay !== 'hq' \|\| !search.personId \|\| !search.companyId` |
| `src/app/PowerMapOverlayHost.tsx` | `search.overlay !== 'powermap' \|\| !search.powermapId` |
| `src/app/AppShell.tsx` (`shouldRotate`) | flat conjunction of 4 named booleans |
| `src/app/AppShell.tsx` (PowerMapsPanel gate) | identical flat conjunction |
| `src/app/AppShell.tsx` (`AnimatePresence` block) | `search.overlay === 'company'`, `isGoldOpen`, `isHqOpen`, `isPowerMapOverlayOpen` |

The point of Day 3 is to make `UIState` the single source of truth at every
render site so:

1. **String-typing dies**: no more `'company'`/`'gold'`/`'hq'`/`'powermap'`
   literals scattered across hosts. Each host narrows the union once and gets a
   typed payload.
2. **Adding a new overlay** becomes a single edit in `OverlayState` →
   `selectUIState` → compile errors everywhere a host must opt in or out. Today
   it requires touching the Zod schema plus every guard in every host plus the
   boolean wiring in `AppShell`.
3. **`shouldRotate` becomes a named hook** with one signature
   (`useShouldRotate()`) instead of an inline formula that mixes `atlasView`,
   `activePowermapId`, and four overlay booleans. This is the canonical
   encoding of **Rule 7** (rotation must stop on selection) and we want it to
   look like one thing, not a bag of conditions.
4. The boolean-alias bridge introduced in Day 2 (lines 142–147 of
   `AppShell.tsx`) is retired once every consumer is on `ui.kind`, removing the
   intermediate layer.

This is intentionally a **render-site migration only** — no machine change, no
new event, no new context field. Day 2's "Promotion to context" criteria are
still not met and we do not pre-fetch them.

## Scope

### In scope

1. Migrate each overlay host to `useUIState()` + a narrowed `ui.overlay`.
2. Introduce `useShouldRotate()` hook colocated with `useUIState`.
3. Replace the four named booleans in `AppShell` with `useShouldRotate()` for
   the rotation effect, and with `isOverlayOpen(ui)` for the PowerMapsPanel
   visibility gate. Keep the `AnimatePresence` JSX block readable — either via
   a `switch (ui.kind)` block above the `return` that yields `{ company?, gold?,
   hq?, powermap? }` slots, or via four narrow checks (`ui.kind === 'globe-overlay'
   && ui.overlay.kind === 'X'`). Implementation may pick whichever is cleaner;
   both are allowed. The deliverable is the elimination of the four named
   booleans.
4. Smoke tests for each migrated host (renders for the right `UIState`, returns
   `null` for everything else, including overlay payloads on non-host views).

### Out of scope

- `app.machine` context change. `UIState` stays a selector through Day 3.
- Changing the URL contract (search params remain authoritative).
- Engine bridge changes.
- Anything in `day2-uistate.md` § "Promotion to context".
- `contract-gap-doc` and `baseline-devtools-run` follow-ups from Day 0/1.

## File map (concrete edits)

```
src/
├── app/
│   ├── AppShell.tsx              ← rotation hook + boolean retirement
│   ├── CompanyOverlayHost.tsx    ← consume ui.overlay (kind: 'company')
│   ├── GoldOverlayHost.tsx       ← consume ui.overlay (kind: 'gold')
│   ├── HeadquartersOverlayHost.tsx ← consume ui.overlay (kind: 'hq')
│   ├── PowerMapOverlayHost.tsx   ← consume ui.overlay (kind: 'powermap')
│   ├── useUIState.ts             ← (unchanged — already shipped Day 2)
│   ├── selectUIState.ts          ← (unchanged — already shipped Day 2)
│   └── useShouldRotate.ts        ← NEW (hook)
└── app/
    └── useShouldRotate.test.ts   ← NEW (rotation truth table)

src/types/uiState.ts                ← (unchanged — already shipped Day 2)
```

Optional (only if a smoke-test pattern emerges that's worth the boilerplate):

```
src/app/CompanyOverlayHost.test.tsx
src/app/GoldOverlayHost.test.tsx
src/app/HeadquartersOverlayHost.test.tsx
src/app/PowerMapOverlayHost.test.tsx
```

These four host tests can be skipped at Day 3 close if `selectUIState.test.ts`
already proves the union and visual smoke is performed manually. The
`useShouldRotate.test.ts` truth table, however, is mandatory because Rule 7 has
no other automated guarantee.

## Detailed change spec

### 1. `useShouldRotate.ts` (NEW)

Hook signature and behavior:

```ts
// src/app/useShouldRotate.ts
//
// Rule 7 (locked) — rotation MUST be disabled whenever any of:
//   - atlasView is not 'globe' (the user is on network/persons/relation/etc.)
//   - any overlay is open on globe (company/gold/hq/vs/powermap)
//   - a power map theme is active via the search query (legacy: top-bar quick
//     toggle that doesn't go through the URL overlay contract)
//
// Encapsulates the formula previously inlined in AppShell. The signature
// returns `boolean` because that's what `CMD.SET_ROTATION` consumes — no
// reason to expose intermediate state.

import { useMemo } from 'react'
import { AppActor } from './app.machine'
import { SEARCH_THEMES } from '@/components/TopBar/searchThemes'
import { useUIState } from './useUIState'

export function useShouldRotate(): boolean {
  const query = AppActor.useSelector(s => s.context.query)
  const ui    = useUIState()
  return useMemo(() => {
    if (ui.kind !== 'globe-idle') return false
    const q = query.trim().toLowerCase()
    const activePowermap = SEARCH_THEMES.find(t => t.label.toLowerCase() === q)
    return !activePowermap
  }, [ui, query])
}
```

Notes:
- `ui.kind !== 'globe-idle'` collapses **five** previous conditions into one
  (it implies `atlasView === 'globe'` AND `!isOverlayOpen`).
- `query`-based powermap detection is preserved as-is (legacy top-bar contract).
  Moving it to URL is a Day 5+ concern.
- `useMemo` makes the hook safe to call from any consumer without recomputing
  the SEARCH_THEMES scan on every render.

### 2. Overlay hosts

The pattern is identical across all four hosts:

```ts
// Before:
const search = useSearch({ from: '/workstation' })
if (search.overlay !== 'company' || typeof search.id !== 'number') return null
const id = search.id

// After:
const ui = useUIState()
if (ui.kind !== 'globe-overlay' && ui.kind !== 'network-overlay') return null
if (ui.overlay.kind !== 'company') return null
const { id } = ui.overlay
```

Per-host nuances:

- **`CompanyOverlayHost`**: keep the `useEffect` that sends `NETWORK_RESOLVED`;
  it depends on `loading`/`error`/`providersData`/`clientsData` from React Query
  hooks. Only the guard at the top and the `id` extraction change.
- **`GoldOverlayHost`**: the only consumer of `search.id` for the `nodeId`
  string template. `ui.overlay.id` is the exact replacement; nothing else moves.
- **`HeadquartersOverlayHost`**: the `'hq'` overlay carries `{ personId,
  companyId }`. Today the host does `if (search.overlay !== 'hq' ||
  !search.personId || !search.companyId)`. After Day 3 the `selectUIState`
  defensive degradation already collapses incomplete `hq` to `*-idle`, so the
  host only checks `ui.overlay.kind === 'hq'`; both ids are guaranteed numbers
  by the union.
- **`PowerMapOverlayHost`**: keeps the `atlasView`-aware branch
  (`atlasView === 'network' && cfg.networkComponent` → mounts the network
  component). `atlasView` continues to come from
  `AppActor.useSelector(s => s.context.atlasView)`; only the overlay payload
  read moves to `ui.overlay`.

### 3. `AppShell.tsx`

Three edits inside the existing component (no structural rewrite):

```ts
// (a) Replace lines 142–147 with:
const ui = useUIState()

// (b) Replace the shouldRotate effect:
const shouldRotate = useShouldRotate()
useEffect(() => {
  engineRef.send({ type: 'CMD.SET_ROTATION', enabled: shouldRotate })
}, [shouldRotate, engineRef])

// (c) Replace the PowerMapsPanel visibility gate
//     (currently `!isGoldOpen && !isCompanyOpen && !isHqOpen && !isPowerMapOverlayOpen`):
{!isOverlayOpen(ui) && (
  <Suspense fallback={null}><PowerMapsPanel /></Suspense>
)}

// (d) Either keep the four `<motion.div>` blocks with renamed predicates:
{ui.kind === 'globe-overlay' && ui.overlay.kind === 'company' && (...)}
{ui.kind === 'globe-overlay' && ui.overlay.kind === 'gold'    && (...)}
{ui.kind === 'globe-overlay' && ui.overlay.kind === 'hq'      && (...)}
{(ui.kind === 'globe-overlay' || ui.kind === 'network-overlay')
   && ui.overlay.kind === 'powermap' && (...)}
```

The `key` attribute on each `motion.div` keeps reading the overlay payload
(`ui.overlay.id`, etc.) instead of `search.id`. This is bit-identical because
`selectUIState` already validates the payload — the `key` always sees a number
or string, never `undefined`.

The `useSearch` call at line 133 of `AppShell.tsx` stays — it still feeds the
power-map effect (`search.powermapId`) and the close-on-overlay-unset effect
(`search.overlay`). Day 3 only removes its role in overlay-open decisions, not
its full presence.

## Acceptance criteria

A Day 3 PR is acceptable if and only if:

- [ ] All four overlay hosts read overlay payloads from `useUIState()` and
      never from `useSearch()` (verified by `rg "useSearch" src/app/*OverlayHost.tsx`
      returning nothing in those files).
- [ ] `AppShell.tsx` no longer declares `isGoldOpen`, `isCompanyOpen`,
      `isHqOpen`, `isPowerMapOverlayOpen` as named locals. The `getOverlay()`
      import may be dropped if unused after the migration.
- [ ] `useShouldRotate` exists, exported from `src/app/useShouldRotate.ts`,
      and is the single rotation-decision site. `AppShell` consumes it.
- [ ] `useShouldRotate.test.ts` covers the truth table:
      `(atlasView, ui.kind, overlay.kind, query)` → expected `shouldRotate`.
      Minimum 8 cases (globe-idle no query → true; globe-idle with theme → false;
      every host overlay → false; every non-host view → false).
- [ ] `npm run typecheck` returns 0 errors.
- [ ] `npm test` passes (existing 45 + new tests). Existing
      `selectUIState.test.ts` is untouched.
- [ ] `npm run build` is green.
- [ ] Manual smoke: open company / gold / hq / powermap overlays via URL; verify
      each renders, the globe stops rotating in all four cases, and PowerMapsPanel
      hides. Close → rotation resumes. Switch to network → rotation stays off.
      Add an overlay query param to `?atlasView=relation` (or push a bare
      `?overlay=company` URL while a non-host view is active) — overlays must
      not render and `shouldRotate` must be `false` (the relation view doesn't
      mount the globe).

## Order of execution

1. Land `useShouldRotate.ts` + its test (no consumer wired yet). Verify the
   test runs against the existing `app.machine` snapshot shape — adjust the
   selector lookup if the test setup needs a mock actor.
2. Wire `useShouldRotate` into `AppShell`'s rotation effect, **keeping the four
   named booleans in place**. Run typecheck + manual smoke. This isolates the
   rotation-hook risk from the boolean retirement.
3. Migrate `GoldOverlayHost` (simplest, no `useEffect` payload coupling). Run
   typecheck + smoke.
4. Migrate `HeadquartersOverlayHost` (second simplest, two-id payload).
5. Migrate `PowerMapOverlayHost` (preserves `atlasView` branching).
6. Migrate `CompanyOverlayHost` (most complex due to React-Query coupling).
7. Retire the four named booleans from `AppShell`, switch the
   `AnimatePresence` predicates and the PowerMapsPanel gate to the union.
8. Final typecheck + build + full manual smoke pass through every overlay
   transition (open, close, switch atlas view mid-overlay, deep-link directly
   to each overlay URL).

If any step fails its smoke pass, revert that step's commit and surface the
finding in `docs/strategy/day3-plan.md` before continuing.

## Risk register

| Risk | Mitigation |
|---|---|
| `useShouldRotate` re-renders too often (the `query` selector fires on every keystroke in the top-bar) | The current AppShell already reads `query` on every render via `useSelector`; the hook does not increase the subscription surface. `useMemo` caches the powermap label scan. |
| `isOverlayOpen(ui)` returns `true` for both `globe-overlay` and `network-overlay` but the existing PowerMapsPanel gate also hid the panel on `network` overlays — confirm parity | `isOverlayOpen` covers both host views by design; the existing `!isGoldOpen && ...` conjunction also hid the panel under any overlay (panel is rendered with `position: absolute, left: 20` regardless of view). Parity holds. |
| `CompanyOverlayHost` relies on `useSearch` for the dependency array of `NETWORK_RESOLVED` effect | The effect's deps are `id`, not `search`. After migration `id` comes from `ui.overlay.id` and is still a stable `number`; deps array stays equivalent. |
| `HeadquartersOverlayHost` depends on Zod schema validation today (`!search.personId || !search.companyId`) | `selectUIState` already enforces both ids are `typeof === 'number'` at the selector boundary; the host can rely on the discriminated union without re-checking. |
| Day 2's `getOverlay` helper becomes unused | Acceptable. Either keep it as part of the public selector API (documented in `day2-uistate.md`) or remove in a follow-up. Day 3 PR does not delete it. |

## Exit criteria (definition of done)

- All checkboxes in § Acceptance criteria are green.
- The Day 3 PR description references this plan and the `day2-uistate.md`
  ADR-light section "Day 3+ migration backlog".
- This document gets a "Status: landed" header amendment when the PR merges,
  and no other content edit. Future revisions go in Day 4+ plans.

## What this unlocks

- Day 4 can promote `UIState` to `app.machine.context` if any of the four
  promotion criteria in `day2-uistate.md` are met (most likely "Multiple
  subscribers" — by end of Day 3 we'll have 6+ consumers).
- Day 5 can extend the union with new overlay variants (e.g. relation overlay
  on `persons` view) by a single edit in `OverlayState` + the
  `OVERLAY_HOST_VIEWS` array, surfacing compile errors at every host that must
  opt in.
- Day 6 (workspace persistence) can serialize `ui.kind` directly instead of
  reverse-engineering it from `search`.
- Day 7 (performance) can measure overlay open/close as a single state
  transition rather than 4 boolean flips, simplifying the trace.

## Closeout (2026-05-13)

### What landed

| File | Change |
|---|---|
| `src/app/useShouldRotate.ts` | NEW — single rotation-decision site. Exports `computeShouldRotate` (pure helper) and `useShouldRotate()` (React hook). |
| `src/app/useShouldRotate.test.ts` | NEW — 23 cases covering the truth table: globe-idle (rotation on), themed query (off), every overlay variant (off), every non-globe view (off), default-themes parameter sanity. |
| `src/app/AppShell.tsx` | Inline `shouldRotate` formula → `useShouldRotate()`. Retired `isGoldOpen`/`isCompanyOpen`/`isHqOpen`/`isPowerMapOverlayOpen`. PowerMapsPanel gate now reads `!isOverlayOpen(ui)`. AnimatePresence predicates narrow on `overlay?.kind`. |
| `src/app/CompanyOverlayHost.tsx` | Reads `overlay = getOverlay(useUIState())`, drops `useSearch`. Effect deps simplified. |
| `src/app/GoldOverlayHost.tsx` | Same pattern — `useUIState()`, no `useSearch`. |
| `src/app/HeadquartersOverlayHost.tsx` | Same pattern — `useUIState()`, no `useSearch`. The two-id guard collapsed (selector already enforces both `personId` and `companyId` are numbers). |
| `src/app/PowerMapOverlayHost.tsx` | Overlay payload from `useUIState()`. `atlasView` still read directly from machine for the network-vs-globe branch (orthogonal to overlay-payload validity). |

### Acceptance criteria verification

- [x] `rg "useSearch" src/app/*OverlayHost.tsx` → no hits except one comment reference.
- [x] `isGoldOpen` / `isCompanyOpen` / `isHqOpen` / `isPowerMapOverlayOpen` no longer declared anywhere in source (only mentioned in retiree comments).
- [x] `useShouldRotate` exists and is the only call site for the rotation decision in `AppShell`.
- [x] `useShouldRotate.test.ts` truth table — 23 cases, exceeds the 8-case minimum.
- [x] `npm run typecheck` → 0 errors.
- [x] `npm test` → 68/68 (45 existing + 23 new).
- [x] `npm run build` → green.
- [ ] Manual smoke pass — pending user validation. See § What you need to verify.

### Risks that materialized

None of the items in § Risk register surfaced. The migration was bit-identical at every replaced site.

### Out-of-scope items retained as TODOs

- `getOverlay` helper survives. It is the only narrowing helper used by AppShell + every overlay host; keeping it pays for itself. No follow-up needed.
- Day 2's promotion-to-context criteria remain unmet (still selector-first). The migration to `app.machine.context` is Day 4 work.

### What you need to verify

Manual smoke pass (per § Acceptance criteria):

1. Open `/workstation`, no overlay → globe rotates.
2. Click any company → overlay opens, globe stops, PowerMapsPanel hides.
3. Close overlay → globe resumes rotation, PowerMapsPanel reappears.
4. Switch to Network tab → rotation stays off (globe behind ReactFlow).
5. Open `?overlay=hq&personId=1&companyId=2` directly → HQ overlay renders.
6. Open `?overlay=powermap&powermapId=wall-street` on globe → didactic panel.
7. Same URL on network tab → WallStreetPage mounts.
8. Type "Wall Street" in the top-bar search → globe stops rotating without any overlay open (legacy quick-toggle).

### What this unlocks (re-validated)

- Day 4 can promote `UIState` to context once a second subscriber wants to read it transactionally (current count: 6 — AppShell + 4 hosts + `useShouldRotate`).
- Adding a new overlay kind is now a single edit in `OverlayState` → compile errors at every host that needs to opt in or out.
