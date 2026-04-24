# deck.gl 9.3 — Reference Guide (IPM Frontend V1)

> **Scope:** imperative deck.gl 9.3+ usage for IPM Frontend engine bridges. Focused on the APIs this project actually uses — not an exhaustive reference. Assumes Rule 5 (no R3F, no `<DeckGL />` reconciler).
>
> **Audience:** future engine authors (globe v2, map view, orbit view, graph view) and anyone debugging the existing `GlobeBridge`.
>
> **Status:** captures empirical findings from Phases 7.3 → 7.3g (2026-04-23 to 2026-04-24), including one major **undocumented deck.gl bug** ([§5](#5-globeview--transitionmanager-bug)).

---

## Table of contents

1. [Installation & imports](#1-installation--imports)
2. [Lifecycle: `new Deck` → `setProps` → `finalize`](#2-lifecycle-new-deck--setprops--finalize)
3. [Controlled vs uncontrolled mode](#3-controlled-vs-uncontrolled-mode)
4. [`onViewStateChange` semantics](#4-onviewstatechange-semantics)
5. [**`_GlobeView` + TransitionManager bug (UNDOCUMENTED)**](#5-globeview--transitionmanager-bug)
6. [`interactionState` — what's reliable and what's not](#6-interactionstate--whats-reliable-and-whats-not)
7. [Layers: ScatterplotLayer + GeoJsonLayer + ArcLayer](#7-layers-scatterplotlayer--geojsonlayer--arclayer-patterns) — includes [`ArcLayer` for network edges](#arclayer-for-network-edges) (Phase 8)
8. [Picking: `onClick`, `onHover`, `pickable`](#8-picking-onclick-onhover-pickable)
9. [Resizing via `ResizeObserver`](#9-resizing-via-resizeobserver)
10. [Type gaps and `any` escape hatches](#10-type-gaps-and-any-escape-hatches)
11. [Canonical patterns](#11-canonical-patterns)
12. [Debug protocols](#12-debug-protocols)
13. [Known issues registry](#13-known-issues-registry)

---

## 1. Installation & imports

**Packages in `package.json`:**

```json
"@deck.gl/core":    "^9.3.0",
"@deck.gl/layers":  "^9.3.0"
```

**Import style** — named imports from subpackages only. Never import from `@deck.gl` root.

```ts
import { Deck, _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
```

**Underscore prefix for views**: `_GlobeView`, `_MapView`, `_OrbitView` are **not deprecated or experimental** — the underscore is legacy naming from deck.gl v7. They are public, stable API. Alias as `DeckGlobeView` etc. for readability.

---

## 2. Lifecycle: `new Deck` → `setProps` → `finalize`

### Constructor

```ts
this._deck = new Deck({
  canvas,              // HTMLCanvasElement (manually created — see §9)
  width, height,       // pixels; must be set explicitly on first mount
  views: new DeckGlobeView({ id: 'globe' }),
  viewState: { ... },  // or initialViewState — see §3
  controller: true,    // enables pan/zoom/rotate via mouse/touch
  layers: [ ... ],
  onViewStateChange, onClick, onHover,  // all optional
});
```

### Prop updates — always `setProps`

```ts
this._deck.setProps({ width, height });       // resize
this._deck.setProps({ layers: [ ... ] });      // re-render layers
this._deck.setProps({ viewState: { ... } });   // controlled-mode camera update
```

**`setProps` semantics:**
- Synchronous — internal state mutates immediately.
- **Triggers `onViewStateChange` synchronously within the same call stack** when `viewState` prop is passed. This synchronous behavior is load-bearing for the `_selfDriving` flag pattern ([§11.2](#112-rotation-loop-with-writeback)).
- Layer updates are batched and rendered on the next animation frame.

### Teardown

```ts
this._deck?.finalize();  // disposes GL context, cancels internal rAF
this._deck = null;
```

Always pair with `ResizeObserver.disconnect()` and clearing any rAF/timer handles you own. Leaked `Deck` instances keep their WebGL context alive and cause "too many WebGL contexts" in Chrome after ~10 remounts.

---

## 3. Controlled vs uncontrolled mode

This is the single most important distinction in deck.gl 9, and the one most likely to cause silent failures.

### Uncontrolled mode — `initialViewState`

```ts
new Deck({ initialViewState: { longitude, latitude, zoom }, controller: true })
```

- Deck seeds its internal viewport from `initialViewState` ONCE at mount.
- The `controller: true` drives viewport updates internally (mouse/wheel).
- `onViewStateChange` still fires for user interactions.
- **`initialViewState` is NOT a live prop.** Subsequent `setProps({ initialViewState: { ... } })` calls are ignored silently.
- **`setProps({ viewState: { ... } })` AFTER mounting uncontrolled** is the trap: deck switches internal tracking to controlled mode, but the first setProps does NOT trigger transitions (there's no "previous controlled viewState" to animate from). See [§5](#5-globeview--transitionmanager-bug).

Use for: one-shot rendering, no programmatic camera changes, no transitions.

### Controlled mode — `viewState`

```ts
new Deck({ viewState: { longitude, latitude, zoom }, controller: true })
```

- Deck treats `viewState` as a live prop.
- **You MUST writeback the controller's proposals** via `onViewStateChange` + `deck.setProps({ viewState })`. Without this, user wheel/drag inputs silently have no effect. ([§4](#4-onviewstatechange-semantics))
- Subsequent `setProps({ viewState: { ...with transition props... } })` correctly triggers `TransitionManager` on `MapView`/`OrbitView`. **But NOT on `_GlobeView`** ([§5](#5-globeview--transitionmanager-bug)).

Use for: programmatic camera control, rotation loops, flyTo animations, any scenario where YOUR code changes the camera.

### Cheat sheet

| Scenario | Mode | Approach |
|---|---|---|
| Static camera, user-only pan/zoom | Uncontrolled (`initialViewState`) | Simplest. No writeback needed. |
| Auto-rotation with user interaction | Controlled (`viewState`) | rAF + writeback + `_selfDriving` flag. |
| Click-to-fly on MapView | Controlled (`viewState` with `transitionInterpolator`) | Works as documented in deck.gl. |
| Click-to-fly on `_GlobeView` | Controlled + **rAF-driven interpolation** | Landmine — see [§5](#5-globeview--transitionmanager-bug). |

---

## 4. `onViewStateChange` semantics

### When it fires

1. **Mount handshake** (controlled mode): deck fires once with `viewState` = your initial input and `interactionState` with all flags false.
2. **User gestures**: drag, pinch, wheel, etc. Fires per frame of the gesture.
3. **Your own `setProps({ viewState })`**: fires synchronously inside the `setProps` call. Same call stack, before `setProps` returns.
4. **`transitionInterpolator` interpolated frames** (when it works): fires per animation frame during the transition.

### The writeback requirement

In controlled mode, deck does NOT update the viewport based on user input unless you writeback:

```ts
onViewStateChange: ({ viewState }) => {
  this._deck?.setProps({ viewState });  // REQUIRED in controlled mode
}
```

Without the writeback, the user can drag/wheel but the globe doesn't move. This is by design — deck trusts your code to be the source of truth in controlled mode.

### The recursion trap

Writeback inside `onViewStateChange` would cause infinite recursion:

```ts
// BAD — infinite loop
onViewStateChange: ({ viewState }) => {
  this._deck?.setProps({ viewState });  // fires onViewStateChange synchronously...
  // ...which calls setProps...which fires onViewStateChange...
}
```

In practice, deck short-circuits when the new viewState deep-equals the last one — so the recursion terminates after one cycle. But if you're mixing rAF-driven updates with writebacks (as in auto-rotation), you need a flag to suppress writebacks of your own frames. See `_selfDriving` pattern in [§11.2](#112-rotation-loop-with-writeback).

### Handler signature

```ts
onViewStateChange: (params: {
  viewState: {
    longitude: number,
    latitude:  number,
    zoom:      number,
    bearing?:  number,
    pitch?:    number,
    minZoom?:  number,
    maxZoom?:  number,
    [any other fields you passed]: ...
  },
  interactionState: {
    isDragging?: boolean,
    isPanning?:  boolean,
    isZooming?:  boolean,
    isRotating?: boolean,
    // NOTE: NO `inTransition` field. See §6 Landmine.
  },
  oldViewState: { ... },
  viewId: string,
}) => void
```

`viewState` is a COMPLETE snapshot — deck always passes all fields, even ones you didn't set. Spread it (`{ ...viewState, longitude: newLng }`) rather than reconstructing from scalars.

---

## 5. `_GlobeView` + TransitionManager bug

**Status: UNDOCUMENTED bug in deck.gl 9.3. Confirmed empirically 2026-04-24.**

### The observation

On `_GlobeView`, the canonical transition API:

```ts
deck.setProps({
  viewState: {
    ...base,
    longitude: base.longitude + 60,
    transitionDuration: 20_000,
    transitionInterpolator: new LinearInterpolator(['longitude']),
    onTransitionStart: () => console.log('start'),
    onTransitionEnd:   () => console.log('end'),
    onTransitionInterrupt: () => console.log('interrupt'),
  },
});
```

...**silently no-ops**. Zero interpolated frames fire. Zero callbacks fire. Deck commits the target viewState instantly without animation.

### How we proved it

1. Added `console.log` inside `onTransitionStart`/`onTransitionEnd`/`onTransitionInterrupt`.
2. Called `setProps` with the full transition payload shown above.
3. Observed in Chrome DevTools: `setProps` dispatches, internal state updates, but **no transition callback EVER fires**.
4. Same payload on `_MapView` (quick sanity check in a test branch): callbacks fire, frames interpolate. → bug is `_GlobeView`-specific.

### The root cause (inferred from deck.gl source read)

- `Deck.setProps({ viewState })` delegates viewport management to the `ViewManager`.
- `ViewManager` creates a `Controller` instance per view (`MapController` for `MapView`, `GlobeController` for `_GlobeView`).
- The `Controller` owns a `TransitionManager` that reads `transitionDuration`/`transitionInterpolator` from viewState and schedules the animation.
- **`GlobeController` does NOT wire its `TransitionManager` the same way `MapController` does.** The transition props are received but never processed. Silent no-op.

No GitHub issue is open on visgl/deck.gl for this as of 2026-04-24. Filed internally in `docs/PHASE_7.3_AUTO_ROTATION_HANDOFF.md`.

### The workaround — manual rAF interpolation

For any camera animation on `_GlobeView`, do NOT use `transitionInterpolator`. Use `requestAnimationFrame` and compute the interpolated viewState yourself:

```ts
// Auto-rotation (this project uses this):
const tick = (ts) => {
  const dt = (ts - lastTs) / 1000;
  const newLng = baseLng + ROTATION_DEG_PER_SEC * dt;
  deck.setProps({ viewState: { ...base, longitude: newLng } });
  requestAnimationFrame(tick);
};

// flyTo (when we need it in Phase 3b):
const tick = (ts) => {
  const t = Math.min(1, (ts - startTs) / DURATION_MS);
  const eased = cubicBezier(0.42, 0, 0.58, 1)(t);
  const viewState = {
    longitude: startLng + (endLng - startLng) * eased,
    latitude:  startLat + (endLat - startLat) * eased,
    zoom:      startZoom + (endZoom - startZoom) * eased,
  };
  deck.setProps({ viewState });
  if (t < 1) requestAnimationFrame(tick);
};
```

**Pair with writeback in `onViewStateChange` + a `_selfDriving` flag** to preserve user interaction. See [§11.2](#112-rotation-loop-with-writeback).

### When to revisit

Check every deck.gl minor version for a `GlobeController` TransitionManager fix. Search changelog for: `GlobeController`, `GlobeView`, `transition`, `globe animation`. If fixed upstream, the rAF workaround can stay (it's equally robust and gives explicit control over easing, pause semantics, and performance), but new engines might prefer the declarative approach.

---

## 6. `interactionState` — what's reliable and what's not

### Documented fields (all optional booleans)

| Field | Trigger | Reliable? |
|---|---|---|
| `isDragging` | left-mouse drag | **Yes** |
| `isPanning`  | right-mouse drag or 2-finger pan | **Yes** |
| `isRotating` | shift+drag or 3-finger drag | **Yes** |
| `isZooming`  | pinch gesture | **Yes (pinch)** |
| `isZooming`  | mouse wheel | **NO** — does not fire consistently on desktop Chrome deck 9.3 |

### Fields you might expect but DON'T exist

- `inTransition` — NOT a field. A guard based on `interactionState?.inTransition` always evaluates falsy.
- `isScrolling` — not exposed.
- `gestureType` — no gesture discriminator.

### Wheel detection workaround

Since `isZooming` misses wheel, detect wheel indirectly:

```ts
// If any gesture fires _idleResumeTimer via onTransitionInterrupt or
// previous gesture frame, subsequent wheels (even without flags) land in a
// "timer pending" state and extend the pause window:
if (userDriven || this._idleResumeTimer !== null) {
  this._userInteracting = true;
  this._armIdleResume();
}
```

This is a side-effect of our `_armIdleResume` pattern, not a deck.gl API. See [§11.2](#112-rotation-loop-with-writeback) for full context.

---

## 7. Layers: ScatterplotLayer + GeoJsonLayer + ArcLayer patterns

### `ScatterplotLayer` for entity dots

```ts
new ScatterplotLayer({
  id: 'globe-rings',
  data: this._entities,        // array of { nodeId, longitude, latitude, type, ... }
  pickable: true,              // enables onClick/onHover
  radiusUnits: 'meters',       // or 'pixels' or 'common'
  getPosition:  (d) => [d.longitude, d.latitude],
  getRadius:    (d) => d.nodeId === this._focusedId ? 120_000 : 80_000,
  getFillColor: (d) => dotColor(d.type),
  getLineColor: (d) => ringColor(d.type),
  getLineWidth: 1.5,
  stroked: true,
  lineWidthUnits: 'pixels',
  updateTriggers: {
    getFillColor: [this._focusedId, this._hoveredId],
    getRadius:    [this._focusedId, this._hoveredId],
  },
});
```

### `updateTriggers` — critical gotcha

deck.gl memoizes accessor functions. If `getFillColor` references `this._focusedId` but you don't list it in `updateTriggers.getFillColor`, **color changes don't re-render** when `_focusedId` updates.

Rule: every captured mutable state in an accessor → listed in `updateTriggers`.

### `GeoJsonLayer` for countries / boundaries

```ts
new GeoJsonLayer({
  id: 'globe-countries',
  data: COUNTRIES_URL,           // URL string or GeoJSON object
  filled: true,
  stroked: true,
  getFillColor: [8, 20, 48, 80],
  getLineColor: [0, 229, 255, 25],
  lineWidthMinPixels: 0.5,
});
```

- Remote URLs are fetched internally; failures are silent (layer renders empty).
- Host your own copy for production. The public CDN in `GlobeBridge.ts` (naturalearth via d2ad6b4ur7yvpq.cloudfront.net) is a Phase 5+ TODO.

### Layer order = z-order

Layers array is painter's algorithm — index 0 renders first (bottom), last renders on top. Order in `GlobeBridge`:

1. `globe-base` (dark sphere fill)
2. `globe-countries` (boundary fills)
3. `globe-arcs` (great-circle network edges, **non-pickable** — decorative)
4. `globe-rings` (pickable dots, stroked)
5. `globe-dots` (decorative inner fill, non-pickable)

Picking respects z-order — top-most `pickable: true` layer wins. Arcs sit **under** the ring layer so click/hover on entity dots is unchanged.

### `ArcLayer` for network edges (Phase 8)

Use when you need **static** geodesic edges (e.g. supplier→focal company→client) revealed by app state (company overlay open), not continuous animation. Overlay-driven: data comes from the service boundary as `EngineArc[]`, then `CMD.SET_ARCS` on the bridge.

**Minimum accessors** (all typically close over `this` / layer instance state):

| Accessor | Role |
|----------|------|
| `getSourcePosition` | `[lng, lat]` of edge start |
| `getTargetPosition` | `[lng, lat]` of edge end |
| `getSourceColor` / `getTargetColor` | RGBA; may taper or match for a flat look |
| `getWidth` | Pixels if `widthUnits: 'pixels'` — map a domain “strength” to a clamped range |

**`greatCircle: true` on `_GlobeView`:** Follows the globe’s curvature. Empirically **works** on the globe in deck.gl 9.3, unlike the `LinearInterpolator` / `TransitionManager` path for `viewState`, which is broken on `_GlobeView` ([§5](#5-globeview--transitionmanager-bug)) — do not conflate the two.

**`updateTriggers` and arc payloads:** Relying only on `data.length` is unsafe: two consecutive opens can yield the **same** length with different companies; accessors may not re-run. `GlobeBridge` uses a monotonic `_arcsRevision` bumped on every `CMD.SET_ARCS` and lists it in `updateTriggers` so accessors always refresh when the logical network changes.

**Performance:** ≤20 arcs (10+10) + ~30 `ScatterplotLayer` dots + countries has been the Phase 8 budget target alongside rotation; if FPS drops, reduce edge count before micro-optimizing the layer (see `CLAUDE.md` globe layer budget).

---

## 8. Picking: `onClick`, `onHover`, `pickable`

### Layer must be pickable

```ts
new ScatterplotLayer({ pickable: true, ... })
```

Non-pickable layers are ignored by the picker even if spatially overlapping.

### `onClick` and `onHover` on Deck constructor

```ts
new Deck({
  onClick: (info) => {
    if (info.layer?.id === 'globe-rings' && info.object) {
      // info.object is the data item from the layer's `data` array
      doSomething(info.object);
    }
  },
  onHover: (info) => {
    const hoveredId = info.layer?.id === 'globe-rings' && info.object
      ? info.object.nodeId
      : null;
    // ... dedup and dispatch
  },
});
```

### The `info` object

| Field | Meaning |
|---|---|
| `info.layer` | The layer hit (or null for empty click) |
| `info.object` | The data item (from layer's `data`) at the hit point, or null |
| `info.index` | Index into `data` array |
| `info.coordinate` | `[lng, lat]` at the hit point |
| `info.picked` | `true` if something was picked |
| `info.x`, `info.y` | Screen pixel coords |

### Hover dedup pattern

`onHover` fires every mouse move, even over the same object. Dedup by tracking the last hovered ID:

```ts
onHover: (info) => {
  const id = info.object?.nodeId ?? null;
  if (id === this._hoveredId) return;  // same object, no change
  this._hoveredId = id;
  this._redraw();  // or emit an event
},
```

Without dedup, you'll dispatch hundreds of `ENTITY_HOVER` events per second during mousemove.

---

## 9. Resizing via `ResizeObserver`

Deck does NOT auto-resize. You manage it:

```ts
// In init():
this._ro = new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  this._deck?.setProps({ width, height });
});
this._ro.observe(input.container);

// In dispose():
this._ro?.disconnect();
```

### Canvas creation

Deck needs an `HTMLCanvasElement`. Create it manually so you control parent DOM + CSS:

```ts
private _createCanvas(container: HTMLDivElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  container.appendChild(canvas);
  return canvas;
}
```

Never pass a React-managed canvas — React reconciliation will clobber deck's internal WebGL context when re-rendering.

---

## 10. Type gaps and `any` escape hatches

deck.gl 9's TypeScript types are incomplete in several places. Known gaps in this project:

| API | Gap | Escape hatch |
|---|---|---|
| `onViewStateChange` params | Generic type parameters not inferred correctly | `({ viewState, interactionState }: any)` |
| `onClick` / `onHover` `info` | Layer discrimination via `info.layer?.id` is untyped | `(info: any)` then narrow via `id` string |
| `ScatterplotLayer` accessors on custom data | Generic `Layer<T>` type inference breaks with union types | Destructure `(d: any)` |
| `viewState` transition props | `transitionDuration`/`transitionInterpolator` typed only in the View-specific types, not in the generic `viewState` shape | Treat viewState as `any` at the bridge boundary |

**`any` TODO convention:** comment every `any` with `// TODO Phase N: replace with typed import from @deck.gl/core`. Budget Phase 4 for retrofitting `@deck.gl/core` generic types where available.

---

## 11. Canonical patterns

### 11.1 Minimal static globe

```ts
this._deck = new Deck({
  canvas: this._createCanvas(input.container),
  width: resolvedW, height: resolvedH,
  views: new DeckGlobeView({ id: 'globe' }),
  initialViewState: { longitude: 0, latitude: 0, zoom: 0.7 },
  controller: true,
  layers: [baseLayer, countriesLayer],
});
```

- Uncontrolled mode.
- User can pan/zoom via mouse.
- No programmatic camera control.

### 11.2 Rotation loop with writeback

```ts
// Fields
private _viewState: any = null;
private _rafHandle: number | null = null;
private _lastTickMs = 0;
private _selfDriving = false;
private _userInteracting = false;
private _idleResumeTimer: ReturnType<typeof setTimeout> | null = null;
private static readonly ROTATION_DEG_PER_SEC = 3;
private static readonly IDLE_RESUME_MS = 800;

// Mount
this._viewState = { ...INITIAL_VIEW };
this._deck = new Deck({
  viewState: { ...INITIAL_VIEW },
  controller: true,
  onViewStateChange: ({ viewState, interactionState }: any) => {
    if (this._selfDriving) {
      this._viewState = viewState;
      return;
    }
    this._viewState = viewState;
    this._deck?.setProps({ viewState });
    const userDriven = !!(
      interactionState?.isDragging ||
      interactionState?.isPanning  ||
      interactionState?.isZooming  ||
      interactionState?.isRotating
    );
    if (userDriven || this._idleResumeTimer !== null) {
      this._userInteracting = true;
      this._armIdleResume();
    }
  },
  // ... canvas, layers, etc
});

// rAF loop
const tick = (ts: number) => {
  this._rafHandle = requestAnimationFrame(tick);
  if (!this._deck || this._userInteracting) { this._lastTickMs = ts; return; }
  const dt = this._lastTickMs === 0 ? 0 : (ts - this._lastTickMs) / 1000;
  this._lastTickMs = ts;
  const base = this._viewState ?? INITIAL_VIEW;
  const newLng = base.longitude + ROTATION_DEG_PER_SEC * dt;
  this._selfDriving = true;
  this._deck.setProps({ viewState: { ...base, longitude: newLng } });
  this._selfDriving = false;
  this._viewState = { ...base, longitude: newLng };
};
```

See `src/engine/GlobeBridge.ts` for the reference implementation + `docs/skills/deck-gl-globe-rotation.md` for the skill version.

### 11.3 flyTo (Phase 3b stub)

```ts
// NOT YET IMPLEMENTED. Target pattern for Phase 3b when focus lands on a
// specific entity. Must use rAF (not transitionInterpolator) per §5.

private _flyTo(target: { longitude: number; latitude: number }): void {
  const start = { ...(this._viewState ?? INITIAL_VIEW) };
  const end = { ...start, longitude: target.longitude, latitude: target.latitude };
  const startTs = performance.now();
  const DURATION = 1200;

  const tick = (ts: number) => {
    const t = Math.min(1, (ts - startTs) / DURATION);
    const eased = this._cubicBezier(t, 0.42, 0, 0.58, 1);
    const viewState = {
      ...start,
      longitude: start.longitude + (end.longitude - start.longitude) * eased,
      latitude:  start.latitude  + (end.latitude  - start.latitude)  * eased,
    };
    this._selfDriving = true;
    this._deck?.setProps({ viewState });
    this._selfDriving = false;
    this._viewState = viewState;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
```

Open question: how does flyTo coexist with auto-rotation's rAF loop? Either:
- Pause auto-rotation during flyTo (`this._userInteracting = true`), or
- Make auto-rotation and flyTo share one rAF driver with a mode-state machine.

Decide at Phase 3b planning.

### 11.4 Layer data updates

```ts
// When entity list changes (from app.machine):
case 'CMD.SET_ENTITIES':
  this._entities = command.data.entities;
  this._redraw();
  break;

private _redraw(): void {
  this._deck?.setProps({ layers: this._buildLayers() });
}
```

Rebuilding the layers array is cheap (deck diffs per-layer internally). Don't mutate an existing layer — always create new `ScatterplotLayer({ ... })` instances.

---

## 12. Debug protocols

### Protocol A — "rotation broken"

```ts
// 1. In onViewStateChange
console.log('[globe] onViewStateChange', {
  longitude: viewState?.longitude,
  zoom: viewState?.zoom,
  interactionState,
  selfDriving: this._selfDriving,
});

// 2. In rAF tick
console.log('[globe] tick', {
  dt, userInteracting: this._userInteracting, longitude: newLng,
});
```

| Symptom | Likely cause |
|---|---|
| No `[globe] tick` logs | rAF loop never started. Check `_startRAFRotation` called after `status='ready'`. |
| `tick` logs, `_userInteracting` stuck true | Mount handshake pausing. Decouple writeback from pause ([§5 Landmine 5](#5-globeview--transitionmanager-bug)). |
| `tick` logs advancing, globe static | `setProps` not taking effect. Check deck instance, canvas parent, WebGL context. |
| `onViewStateChange` recurses | `_selfDriving` flag ordering wrong. |
| Zero `onTransitionStart` logs on LinearInterpolator | You hit [§5](#5-globeview--transitionmanager-bug). Pivot to rAF. |

### Protocol B — "zoom/drag broken"

```ts
// In onViewStateChange, before writeback:
console.log('[globe] user input', { viewState, interactionState });
```

| Symptom | Likely cause |
|---|---|
| Log fires but globe doesn't react | Missing writeback in controlled mode. |
| Log doesn't fire on wheel | Canvas missing or wrong parent; or deck uncontrolled and controller: true somehow disabled. |
| Log fires with all `interactionState` flags false on wheel | Expected ([§6 Landmine](#6-interactionstate--whats-reliable-and-whats-not)). Use `_idleResumeTimer !== null` heuristic. |

### Protocol C — "picking broken"

```ts
// In onClick/onHover:
console.log('[globe] pick', { info });
```

| Symptom | Likely cause |
|---|---|
| `info.picked: false` everywhere | Layer missing `pickable: true`. |
| `info.object` undefined on a pickable layer | Accessor returning wrong shape. |
| Clicks fire, hovers don't | Implicit — both are configured at Deck level. Check hover handler is defined. |

---

## 13. Known issues registry

| # | Issue | Status | Reference |
|---|---|---|---|
| 1 | `_GlobeView` TransitionManager silent no-op | **Blocking — workaround via rAF** | [§5](#5-globeview--transitionmanager-bug), Phase 7.3g |
| 2 | `isZooming` unreliable for mouse wheel | **Workaround via timer heuristic** | [§6](#6-interactionstate--whats-reliable-and-whats-not), Phase 7.3g |
| 3 | `initialViewState` not live-updatable | **Documented deck behavior, not a bug** | [§3](#3-controlled-vs-uncontrolled-mode) |
| 4 | TypeScript gaps on `onViewStateChange` params | **`any` cast at boundary** | [§10](#10-type-gaps-and-any-escape-hatches), Phase 4 retrofit |
| 5 | Remote GeoJSON CDN unhosted | **Phase 5+ — host locally** | `GlobeBridge.ts` L29-31 |
| 6 | Layers not rerendering on captured-state change | **Must list in `updateTriggers`** | [§7](#7-layers-scatterplotlayer--geojsonlayer--arclayer-patterns) |

---

## Related documents

- `src/engine/GlobeBridge.ts` — canonical imperative bridge implementation
- `src/engine/contracts/bridge.ts` — `IEngineBridge` interface
- `docs/skills/deck-gl-globe-rotation.md` — Claude skill for rotation debugging
- `.claude/skills/deck-gl-globe-rotation/SKILL.md` — Cursor agent version
- `docs/PHASE_7.3_AUTO_ROTATION_HANDOFF.md` — historical resolution record
- `ZOOM_LAG_KNOWN_ISSUE.md` — wheel zoom root-cause notes
- `CLAUDE.md` — globe layer budget (60fps target, ~100 entity dots max)

---

## Changelog

| Date | Phase | Event |
|---|---|---|
| 2026-04-23 | 7.3 / 7.3b | Initial rAF attempts; wheel zoom regression identified |
| 2026-04-24 | 7.3c → 7.3f | Dead-end spiral on `LinearInterpolator` + `_GlobeView`; 4 phases burned |
| 2026-04-24 | 7.3g | Empirical proof `onTransitionStart` never fires; pivot to rAF + writeback + `_selfDriving`; rotation + zoom + drag all working |
| 2026-04-24 | 7.3g | This document created |
| 2026-04-25 | 8 | §7: `ArcLayer` on `_GlobeView` (great circle, `updateTriggers` + revision counter); `globe-arcs` layer order |
