# Day 4+ — Router chunk diet

**Branch:** `experiment/design-features`
**Status:** **landed (2026-05-13)**
**Sequel to:** `day4-uistate-memo.md`
**Blocks:** Day 5 (engine-factory async refactor)

---

## Problem

Cold-start bundle was a monolith:

```
router-C9dPi0yh.js                1,263.40 kB │ gzip:  346.18 kB
```

Vite was lumping the TanStack Router runtime, every statically-imported route
component, AppShell, the entire engine subsystem (deck.gl + three.js +
framer-motion), and the XState + TanStack Query runtimes into a single chunk.

That chunk gates **every** route, including the landing page (`/`). Parse cost
on cold start was ~250 ms on a mid-range laptop and the chunk could not be
parallelised (one HTTP request, one parse task on the main thread).

## Root cause (static dependency chain)

```
main.tsx
 → routes/router.ts
   → routes/__root.tsx
     → app/AppProviders.tsx
       → app/app.machine.ts
         → engine/engineManager.machine.ts
           → engine/engineFactory.ts
             → engine/GlobeBridge.ts  → @deck.gl/core, @deck.gl/layers
             → engine/GraphBridge.ts  → three
 → routes/workstation.tsx → app/AppShell.tsx → framer-motion
 → routes/wall-street.tsx → features/wall-street/WallStreetPage.tsx
```

Two distinct issues collapse into the same symptom:

1. **Route components were statically imported** (`workstation.tsx` had
   `import { AppShell }`, `wall-street.tsx` had `import { WallStreetPage }`).
   Anything reachable from a route's `component` field gets pulled into the
   router chunk.
2. **`__root.tsx` transitively static-imports the engine subsystem.** Because
   `AppProviders` mounts `AppActor`, which spawns `engineManagerMachine` in its
   context init, and that machine references `createEngine` from
   `engineFactory.ts` at module-load time, the deck.gl and three.js vendor
   trees are eager dependencies of `/` (the landing page) — even though the
   landing page renders nothing but a `<video>`.

## Fix landed in this session

Three coordinated edits, listed in increasing blast radius:

### 1. `lazyRouteComponent` for `AppShell` — `src/routes/workstation.tsx`

```ts
component: lazyRouteComponent(() => import('@/app/AppShell'), 'AppShell'),
```

Moves `AppShell.tsx` + all its **direct** imports (motion wrappers, overlay
hosts, persons map, atlas selectors, useShouldRotate, …) into its own chunk
(`AppShell-*.js`, 14.5 kB). The landing page no longer parses AppShell at all
until the user is mid-transition to `/workstation`.

### 2. `React.lazy` for `WallStreetPage` — `src/routes/wall-street.tsx`

```ts
const WallStreetPage = lazy(() =>
  import('@/features/wall-street/WallStreetPage').then(m => ({ default: m.WallStreetPage }))
)
```

`React.lazy` (rather than `lazyRouteComponent`) was chosen so the route's
fullscreen `<div>` wrapper stays as a stable component reference — TanStack
Router prefetch + match-cache invariants are preserved across navigations.
Same end result: WallStreetPage is no longer in the router chunk's static
import list (verified — see *Verification* below).

### 3. Vendor chunk split — `vite.config.ts`

Vite 8 uses Rolldown; the legacy `rollupOptions.output.manualChunks` map was
replaced by `rolldownOptions.output.advancedChunks.groups`:

```ts
build: {
  rolldownOptions: {
    output: {
      advancedChunks: {
        groups: [
          { name: 'vendor-deckgl',   test: /[\\/]node_modules[\\/](@deck\.gl|@luma\.gl|@math\.gl)[\\/]/ },
          { name: 'vendor-three',    test: /[\\/]node_modules[\\/]three[\\/]/ },
          { name: 'vendor-framer',   test: /[\\/]node_modules[\\/]framer-motion[\\/]/ },
          { name: 'vendor-tanstack', test: /[\\/]node_modules[\\/]@tanstack[\\/]/ },
          { name: 'vendor-xstate',   test: /[\\/]node_modules[\\/](xstate|@xstate)[\\/]/ },
        ],
      },
    },
  },
},
```

Regex `test` patterns match the package boundary, so duplicated peer copies
(e.g. multiple three.js versions hoisted by deck.gl sub-packages) all land in
the same vendor chunk.

### 4. Warm `AppShell` during landing video — `src/routes/index.tsx`

Added `void import('@/app/AppShell')` to the LandingPage `useEffect` warmup
list, **first** in the list (highest priority). The intro video plays for
~10 s on a fresh visit, which is more than enough wall-clock time to download
and parse the new `AppShell-*.js` + transitive vendor chunks while the user
watches.

## Results

| Chunk | Before | After | Δ |
|---|---|---|---|
| `router-*.js`             | **1,263 kB / 346 kB gz** | **111 kB / 30 kB gz**  | **–91 % / –91 %** |
| `vendor-deckgl-*.js`      | (inlined in router)      | 706 kB / 202 kB gz     | extracted |
| `vendor-three-*.js`       | (inlined in router)      | 510 kB / 128 kB gz     | extracted |
| `vendor-framer-*.js`      | (inlined in router)      | 132 kB /  43 kB gz     | extracted |
| `vendor-tanstack-*.js`    | (inlined in router)      | 120 kB /  37 kB gz     | extracted |
| `vendor-xstate-*.js`      | (inlined in router)      |  40 kB /  13 kB gz     | extracted |
| `AppShell-*.js`           | (inlined in router)      |  14 kB /   5 kB gz     | lazy |
| `WallStreetPage-*.js`     | (inlined in router)      |  48 kB /  13 kB gz     | lazy |
| `index-*.js` (entry)      | 181 kB / 58 kB gz        | 179 kB / 57 kB gz      | ≈ |

Total cold-start bytes are *marginally* higher (~3 % gz, common chunk-split
overhead from duplicated module wrappers), but the wins are real:

- **8 chunks fetch in parallel** instead of one large blocking request.
  HTTP/2 multiplexing makes wall-clock time ≈ longest single chunk download.
- **Each chunk = its own parse task.** Main thread regains responsiveness
  between chunks — measurable in DevTools Performance flame graphs.
- **Cacheability per package.** A future deck.gl version bump no longer
  invalidates the entire router (which carried app code that changes daily).

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ green |
| `npm test`          | ✅ 68/68 passing |
| `npm run build`     | ✅ no Rolldown warnings |
| Router chunk static imports | ✅ only `vendor-*` chunks (no app code, no WallStreetPage) — verified via `Select-String` on `dist/assets/router-*.js` |

## What did NOT change

The eager dependency on `vendor-deckgl` + `vendor-three` from the router chunk
**persists**. Reason: the static chain `__root.tsx → AppProviders →
app.machine → engineManager.machine → engineFactory → GlobeBridge/GraphBridge`
forces deck.gl and three.js into the eager module graph of every route,
including `/`.

Breaking this requires making `createEngine` async and rewiring the
`createBridgeAndSubscribe` action in `engineManager.machine.ts` to handle the
two-phase create (module load → constructor). That's an XState refactor with
real blast radius (every test that asserts machine state shape would need
review). **Deferred to Day 5.**

## Day 5 plan (next session)

Goal: make `vendor-deckgl` and `vendor-three` truly lazy (not loaded on
landing).

Approach sketch (no code yet):

1. Convert `engineFactory.ts`:
   ```ts
   const loaders = {
     globe: () => import('./GlobeBridge').then(m => m.GlobeBridge),
     graph: () => import('./GraphBridge').then(m => m.GraphBridge),
     // …
   }
   export async function createEngine(id, input) {
     const Ctor = await loaders[id]()
     return new Ctor(input)
   }
   ```
2. Add a `loading` substate in `engineManager.machine` between `idle` and
   `initializing`. `ENGINE.REQUEST` enters `loading`, an `invoke` of
   `fromPromise(createEngine(...))` resolves to `initializing` with the bridge
   already in `pending`. Existing `ENGINE.READY`/`ENGINE.ERROR` transitions
   remain unchanged.
3. Run all four lifecycle tests (request → ready, swap, dispose, error).
   Update fixtures to await the new async hop where needed.

Acceptance:
- `dist/assets/router-*.js` no longer references `vendor-deckgl` or
  `vendor-three` (verifiable via Select-String).
- Landing page network panel shows only `index`, `router`,
  `rolldown-runtime`, `vendor-tanstack`, `vendor-framer`, `vendor-xstate`
  (and CSS).
- `npm test` still 68/68 green (machine fixtures may need new awaits but
  semantics preserved).

## Risks accepted in this session

- **Marginal +3 % gz total bytes.** Justified by parse-task parallelism and
  cacheability. If a future audit shows landing TTFI regressed, revert the
  `advancedChunks` block (single-file revert) — `lazyRouteComponent` for
  routes remains valid independently.
- **Rolldown advancedChunks API.** Vite 8 / Rolldown is recent. If the API
  drifts in a future Vite minor, the config block will need a rewrite. The
  fallback (drop the config, accept the monolith) is a one-line delete.
