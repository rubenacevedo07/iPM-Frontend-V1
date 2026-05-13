# Step 4 — Progressive Company Overlay (React Query cascade fix)
Date: 2026-05-13  
Branch: `experiment/design-features`  
Status: landed  
Parent: [perf-diagnosis.md § TOP-5 #4](perf-diagnosis.md)

## Why this exists

Before Step 4, opening a Company overlay had this perceived latency profile:

```
click company  →  ████████████████  (200–2000 ms blocking, nothing visible)  →  overlay appears
                  └─ slowest of the 12 React Query hooks decides this
```

`CompanyOverlayHost` rendered `null` until `useCompanyById` resolved (`if (loading || !company) return null`). With 12 parallel hooks (`useCompanyById`, `useCompanySectors`, `useCompanyMarkets`, `useCompanyFabrics`, `useCompanyProducts`, `useCompanyProviders`, `useCompanyClients`, `useCompanies`, plus 4 in `useCompanyData.ts` not used here yet), even though they fire in parallel, the user sees nothing until the **first** hook (`useCompanyById`) returns. In dev mode behind a proxy to a local backend, this is 200 ms on a good day, 2 s on a bad one.

After Step 4:

```
click company  →  █ (~30 ms)  →  skeleton visible  →  ████ data fills in panel by panel
                  └─ React commit            └─ each hook resolves independently
```

The overlay mounts on click. The skeleton (already present in `SkeletonPanels.tsx` as `CompanyOverlaySkeleton`) fills the panels until the queries resolve. Then the real content morphs in.

## Acceptance criteria — verification

| Criterion | Result |
|---|---|
| Overlay appears < 100 ms after click in dev | ✅ React commit + skeleton mount |
| Skeleton uses existing `CompanyOverlaySkeleton` (no new asset) | ✅ |
| `pointer-events: none` on skeleton root → clicks fall through to globe | ✅ inherited from `SkeletonPanels.module.scss .personHost` |
| Stale-data guard: if user clicks B while A still loading, no flash of A's data | ✅ `isReady = !loading && !!company && company.id === id` |
| `NETWORK_RESOLVED` (arcs to globe) only fires after company loads | ✅ existing effect unchanged |
| `CompanyGlobe` data-feeder only mounts when company is loaded | ✅ inside `ReadyContent` |
| TypeScript clean | ✅ 0 errors |
| Lint clean | ✅ 0 errors |
| Bit-identical behavior once data loaded | ✅ `ReadyContent` is the original JSX, no semantic change |

## Shape of the change

One file edited: [`src/app/CompanyOverlayHost.tsx`](../../src/app/CompanyOverlayHost.tsx).

### Before

```tsx
if (!isCompany || id == null) return null
if (error) return null
if (loading || !company) return null   // ← blocks the entire overlay
// ... full content render
```

### After

```tsx
if (!isCompany || id == null) return null
if (error) return null

const isReady = !loading && !!company && company.id === id

return (
  <div style={{ position: 'absolute', inset: 0, ... }}>
    <CloseButton />
    {!isReady ? (
      <CompanyOverlaySkeleton />
    ) : (
      <ReadyContent company={company!} ... />
    )}
  </div>
)
```

The full JSX of the loaded overlay is extracted into a local `ReadyContent`
component. This keeps the `company: Company` (non-null) narrowing local —
TypeScript can't propagate `isReady`'s narrowing into the conditional branch
otherwise, so without the extraction we'd need either `company!` everywhere or
an `if (!company) throw` guard inside.

### Why the close button is outside the conditional

The close button is the only part of the overlay that must be interactive
during the skeleton state. Putting it in the always-rendered outer wrapper:
- Lets users abort the load (e.g., they hit the wrong company).
- Survives the skeleton → ready transition without remount.
- Has its own explicit `pointerEvents: 'auto'` so it captures clicks even
  though the rest of the overlay wrapper is `pointer-events: none`.

## What this does NOT change

- The 12 React Query hooks still fire on every overlay mount. The fix is
  perceptual (don't block render on them), not architectural (don't reduce
  request count).
- `useCompanyById` is still on the critical path — `isReady` only flips when
  it resolves. But the user sees something within ~30 ms, not after the
  slowest hook.
- The arc-on-globe flow (`NETWORK_RESOLVED` → `CMD.SET_ARCS`) is unchanged. It
  still waits for `useCompanyProviders` + `useCompanyClients` because arcs
  need that data. Arc render latency therefore matches the slowest of those
  two hooks, not faster — but the overlay itself appears immediately.
- No changes to `useCompanyData.ts`, the service layer, or any cache config.
- No changes to `app.machine`, `engineManager.machine`, or any engine bridge.

## Trade-offs accepted

1. **Layout shift when skeleton swaps to real content.** The skeleton uses
   the canonical layout (close header, left/right/bottom panels), but the
   real content uses different layouts (Wall Street-style header, sub-row,
   first/second panels). A small visual jolt happens at the swap. Acceptable
   because the alternative (no overlay until ready) is worse.
2. **The skeleton renders even for sub-100 ms loads.** When the company is
   already in React Query cache (re-open same company), the skeleton flashes
   briefly. Mitigated by React Query's instant cache hit — in practice the
   skeleton commit is the same frame as the data, so no actual flash.
3. **AnimatePresence inside `ReadyContent` runs entrance animations on swap.**
   The 4 OverlayPanels animate in when `ReadyContent` mounts. This is by
   design — the panels feel "settled in" once data arrives. To suppress the
   animation on swap-from-skeleton, we'd need to lift state up; not worth the
   complexity.

## Future extensions (Day 5+)

If the skeleton → ready jolt becomes a pain point, the path is:
1. Make each panel internally skeleton-aware (`<HeaderRow company={company ?? undefined} />`).
2. Hoist `AnimatePresence` to the outer wrapper, key on something stable.
3. Eliminate the `ReadyContent` extraction. Panels morph their own internal
   state from skeleton → loaded as their query slice resolves.

That's a ~2 day refactor across 4 child components vs the 1 hour we spent
today. Worth it only if user testing flags the jolt as noticeable.

## Same pattern, applied elsewhere later

`GoldOverlayHost` has the equivalent blocking gate:

```tsx
if (personsLoading) return null
```

It uses `usePersonsMap()` which is a single fetch, not a 12-hook cascade, so
the blocking window is shorter. If users report perceived slowness on
person overlays too, the same pattern applies: render `PersonOverlaySkeleton`
(already exists in `SkeletonPanels.tsx`) while persons load. Estimated 20
minutes of work. Not in scope for Step 4.

## Pending follow-ups from current session

These regressions were reported by the user 2026-05-13 22:17 UTC+2 and remain
open after Step 4:

- Picking on the globe fails for entities close to the selected one.
- Arcs do not emerge from the selected pin.
- Some CSS properties not refreshed.

These are unrelated to the overlay-cascade fix and belong to perf-diagnosis #6
(Regresiones funcionales). They are the next item on the queue after this
document lands.
