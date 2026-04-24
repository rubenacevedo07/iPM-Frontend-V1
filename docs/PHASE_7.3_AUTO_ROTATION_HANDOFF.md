# Handoff — Globe auto-rotation with deck.gl (@deck.gl/core 9.3)

> **STATUS: RESOLVED 2026-04-23 (Phase 7.3c).** See the "Resolution" section at the bottom. The analysis below remains for historical context.

Self-contained technical brief. Share with any AI / collaborator.

---

## TL;DR

Trying to restore **continuous auto-rotation** of a deck.gl `_GlobeView` while preserving **user zoom + drag interactivity**. The rAF loop that advances `longitude` is racing with user input handling.

- Attempt 1 (commit `b67edd1`, Phase 7.3): auto-rotation works, **mouse-wheel zoom silently fails**.
- Attempt 2 (commit `eccff9b`, Phase 7.3b): added debounce-pause on every `viewState` change. **User reports worse than attempt 1** — exact symptom TBD (likely jitter, stutter, or rotation stutters on wheel events).

Seeking: a clean pattern to run a 60fps longitude-advancing loop on a deck.gl Globe view **without clobbering the user's concurrent zoom / drag inputs**.

---

## Stack

- deck.gl: `@deck.gl/core@^9.3.0` + `@deck.gl/layers@^9.3.0`
- React 19.2.4 (but GlobeBridge is an imperative class, NOT a React component — uses `new Deck({...})` directly per architectural Rule 5: "no R3F, no reconciler")
- Vite 8
- TypeScript 5, `verbatimModuleSyntax: true`
- Windows + Chrome (no touchscreen — all interaction is mouse wheel + left-drag)

Architecture rule: the globe engine is wrapped in a class `GlobeBridge implements IEngineBridge`. It exposes `send(command)` / `onEvent(handler)` channels. No React state, no hooks. deck.gl is instantiated imperatively with `new Deck({...})` and updated via `deck.setProps({...})`.

---

## Files

- **Main file (470 LOC):** `src/engine/GlobeBridge.ts`
- Repo root: `C:/Users/ruben/source/repos/iPM_GV/IPM_Frontend_V1`
- Branch: `phase7.3-auto-rotation`
- Dev server: Vite on `http://localhost:5183/workstation`

---

## History

| Commit | What | State |
|---|---|---|
| `5009c61` | **Removed** auto-rotation (zoom-lag regression) | pre-Phase-4 |
| `b67edd1` (7.3) | Re-added auto-rotation with interactionState flag pause | rotation OK, wheel-zoom breaks |
| `eccff9b` (7.3b) | Added 300ms debounce on every viewState change | user reports worse |

The removal comment read: *"Auto-rotation removed — caused zoom lag (see ZOOM_LAG_KNOWN_ISSUE.md). Restore from git history if re-enabled via a non-competing mechanism."*

The non-competing requirement is the key constraint.

---

## Current implementation (after 7.3b)

### State on the class
```ts
private _deck: Deck<any> | null = null;
private _rafHandle: number | null = null;

private _longitude = 20;   // from INITIAL_VIEW
private _latitude = 25;
private _zoom = 0.7;

private _isInteracting = false;
private _interactionReleaseTimer: ReturnType<typeof setTimeout> | null = null;
private readonly _rotationDegPerSec = 3;
private static readonly INTERACTION_RELEASE_MS = 300;
```

### Deck construction (init())
```ts
this._deck = new Deck({
  canvas: this._createCanvas(input.container),
  width: resolvedW,
  height: resolvedH,
  views: new DeckGlobeView({ id: 'globe' }),
  initialViewState: {
    longitude: this._longitude,
    latitude:  this._latitude,
    zoom:      this._zoom,
    minZoom:   0,
    maxZoom:   5,
  },
  controller: true,
  layers: this._buildLayers(),

  onViewStateChange: ({ viewState, interactionState }: any) => {
    this._longitude = viewState.longitude ?? this._longitude;
    this._latitude  = viewState.latitude  ?? this._latitude;
    this._zoom      = viewState.zoom      ?? this._zoom;

    // Pause rotation via EITHER:
    //   (a) interactionState flags (drag + touch-pinch)
    //   (b) 300ms debounce on any viewState change (catches mouse-wheel)
    const flagActive = !!(
      interactionState?.isDragging ||
      interactionState?.isZooming  ||
      interactionState?.isPanning
    );
    this._isInteracting = true;
    if (this._interactionReleaseTimer !== null) {
      clearTimeout(this._interactionReleaseTimer);
    }
    if (!flagActive) {
      this._interactionReleaseTimer = setTimeout(() => {
        this._isInteracting = false;
        this._interactionReleaseTimer = null;
      }, 300);
    }
  },

  onClick: (info: any) => { /* entity click → emit event */ },
  onHover: (info: any) => { /* entity hover → emit event + _redraw */ },
});

this._startRotation();
```

### Rotation loop
```ts
private _startRotation(): void {
  if (this._rafHandle !== null) return;
  let lastMs = performance.now();
  const tick = (nowMs: number) => {
    const dtSec = (nowMs - lastMs) / 1000;
    lastMs = nowMs;
    if (!this._isInteracting && this._deck && this._status === 'ready') {
      this._longitude = this._normalizeLongitude(
        this._longitude + this._rotationDegPerSec * dtSec,
      );
      this._deck.setProps({
        viewState: {
          longitude: this._longitude,
          latitude:  this._latitude,
          zoom:      this._zoom,
          minZoom:   0,
          maxZoom:   5,
        },
      });
    }
    this._rafHandle = requestAnimationFrame(tick);
  };
  this._rafHandle = requestAnimationFrame(tick);
}

private _stopRotation(): void {
  if (this._rafHandle !== null) {
    cancelAnimationFrame(this._rafHandle);
    this._rafHandle = null;
  }
  if (this._interactionReleaseTimer !== null) {
    clearTimeout(this._interactionReleaseTimer);
    this._interactionReleaseTimer = null;
  }
  this._isInteracting = false;
}

private _normalizeLongitude(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}
```

### `_redraw()` — called from hover + entity-set commands
```ts
private _redraw(): void {
  this._deck?.setProps({ layers: this._buildLayers() });
}
```

Note: `_redraw` passes only `layers`, not `viewState`. But `_startRotation`'s tick passes `viewState` on every successful tick — this switches deck from uncontrolled to controlled viewState mode permanently.

---

## Problem statement

When the user scrolls the mouse wheel to zoom:

1. deck.gl's controller proposes a new `viewState.zoom`
2. `onViewStateChange` fires with the new zoom → captured into `this._zoom`
3. `_isInteracting` is set to `true` and the 300ms timer is armed
4. Before the timer expires, the rAF tick (60fps) fires and — when it sees `_isInteracting === true` — **skips** the `setProps`
5. 300ms later, `_isInteracting` becomes `false`
6. Next rAF tick writes `viewState.zoom = this._zoom` (the updated value from step 2)

Theory: this should preserve the user's zoom. The user reports it does not.

**User-observed symptoms** (limited detail):
- Attempt 1 (no debounce): "zoom no funciona" — wheel doesn't zoom at all, rotation is fine
- Attempt 2 (with debounce): "ahora funciona peor" — unclear, likely rotation stutter + zoom still broken

**Suspected causes (to investigate):**

1. **Controlled vs uncontrolled viewState race.** Once we pass `viewState` to `setProps`, deck.gl switches to "controlled" mode where WE own viewState truth. The controller proposes updates via `onViewStateChange` but won't apply them until WE apply. If our rAF tick happens to write a stale `this._zoom` before `onViewStateChange` has a chance to fire (mid-wheel-event), the zoom is lost.

2. **onViewStateChange latency.** Is deck.gl's `onViewStateChange` actually called BEFORE the internal state is committed, or AFTER? Timing may matter. If it fires after commit, our capture is correct but our next-tick write may overwrite it with a stale value read from `this._zoom` if multiple wheel events fire within one rAF frame.

3. **interactionState.isZooming unreliable for wheel zoom.** Documented (loosely) in deck.gl — flag mainly set for touch-pinch. Our flag check misses wheel events; the debounce was added to cover this.

4. **`viewState` prop shape requirement.** deck.gl might require passing `viewState` WITH all fields including minZoom/maxZoom — but our first write omits something subtle (e.g., `bearing` or `pitch` for GlobeView), causing deck.gl to re-initialize those defaults every tick.

5. **Debounce window too short.** 300ms might not cover a sustained wheel-scroll (user scrolls many notches over 1-2 seconds). Every wheel event resets the timer, so this shouldn't be the issue, but worth checking if the resetting is actually happening.

---

## Alternative approaches to evaluate

### Option A — Don't write full viewState in rAF; only write longitude
**REJECTED.** deck.gl requires a complete viewState when you pass the `viewState` prop. Partial writes reset omitted fields to defaults.

### Option B — Use `transitionInterpolator` for the rotation
**ADOPTED (Phase 7.3c).** Long-duration `LinearInterpolator(['longitude'])` segments, chained via `onTransitionEnd`, interrupted cleanly via `onTransitionInterrupt`. The "doesn't loop cleanly" concern turned out to be unfounded — chaining from the current viewState inside onTransitionEnd produces seamless rotation. See Resolution section below.

### Option C — Don't switch to controlled mode; manipulate viewState via `initialViewState` only at setup
**REJECTED.** `initialViewState` applies once. Not viable for continuous rotation.

### Option D — Manipulate deck.gl's viewport directly via its internal `_ViewState`
**REJECTED.** Fragile, undocumented, version-coupled.

### Option E — Detect wheel events at the DOM level BEFORE deck.gl sees them
**NOT ADOPTED (unnecessary).** Option B resolves the wheel issue without it, because transitions are interruptible by the controller natively. Option E remains a viable safety net if future wheel-driven failures ever bypass onViewStateChange entirely.

### Option F — Completely separate rotation from deck's controller
**REJECTED.** Overkill; Option B is simpler and uses the documented API.

### Option G — Give up on per-frame longitude updates; animate via CSS transform on the canvas
**REJECTED.** Not viable with WebGL — canvas coords are baked inside the GL context.

---

## What another AI should help with

1. **Root cause diagnosis.** Why does passing `viewState` to `setProps` on every rAF tick break wheel-zoom handling in deck.gl 9.3 `_GlobeView` + `controller: true`? Is there a "both controlled and uncontrolled simultaneously" mode or a canonical pattern?

2. **Recommended pattern** for continuous auto-rotation on a deck.gl Globe that coexists cleanly with user pan/zoom via the built-in controller. Looking for a known idiom, not an invented workaround.

3. **Specific concern:** the project's architectural Rule 5 forbids React reconciler/R3F patterns — the bridge must use `new Deck({...})` imperatively. A React-based hook using `<DeckGL>` component with hooks is NOT an option.

---

## Reproduction

```bash
cd C:/Users/ruben/source/repos/iPM_GV/IPM_Frontend_V1
git checkout phase7.3-auto-rotation
npm install
npm run dev
# Open http://localhost:PORT/workstation (port auto-selected, usually 5178-5183)
# Try mouse-wheel zoom on the globe
```

To see attempt 1 only (no debounce): `git checkout b67edd1`
To see removed state (no rotation at all): `git checkout v1-phase-7`

---

## Files to read in priority order

1. `src/engine/GlobeBridge.ts` — the whole thing, 470 LOC. Auto-rotation changes concentrated in `init()` onViewStateChange (L119-144), `_startRotation()` (L403-426), `_stopRotation()` (L429-441).
2. `src/engine/contracts/bridge.ts` — `IEngineBridge` interface contract.
3. `src/app/AppShell.tsx` — how GlobeBridge is instantiated and fed entity data via `CMD.SET_ENTITIES`.

---

## Architectural constraints any fix must respect

- **Rule 5 (CLAUDE.md):** deck.gl imperative only — `new Deck({...})`, `deck.setProps({...})`. No `<DeckGL />`, no reconciler, no R3F.
- **Rule 6:** canonical files (copied from v3 at `IPM_Frontend/src/...`) are immutable. `GlobeBridge.ts` is V1-authored (not canonical), so it IS editable.
- **IEngineBridge contract:** must preserve `init`/`send`/`onEvent`/`status` semantics. The rotation is an internal concern of GlobeBridge; callers shouldn't know it exists.

---

## Desired end state

- Globe rotates autonomously at ~3°/sec when idle.
- Mouse wheel zoom works exactly like a standard deck.gl controller would — smooth, immediate, no lag.
- Click-drag pans/rotates the globe manually; auto-rotation pauses and resumes on release.
- No zoom-lag (the 5009c61 regression that caused the original removal).
- Click + hover on entity dots (ScatterplotLayer `globe-rings`) still work — these are validated OK in the current state.

---

## Resolution (Phase 7.3c, 2026-04-23)

**Pattern adopted: Option B (`LinearInterpolator(['longitude'])` + chained segment transitions).**

### Root cause confirmed
The rAF + `setProps({viewState})` loop is racy by design. Per-frame writes force deck into controlled viewState mode; the controller's wheel/drag proposals come through `onViewStateChange` as suggestions and are lost between capture and the next rAF write (especially because the old code reassembled viewState from scalar fields, dropping `bearing`/`pitch`/transition metadata). No flag-gate or debounce can fix this — the race is inherent to per-frame controlled writes.

### Mechanism
One file touched: `src/engine/GlobeBridge.ts`.

```ts
// State
private _viewState: any = null; // full last-known viewState — never reassembled
private _rotationScheduled = false;
private _idleResumeTimer: ReturnType<typeof setTimeout> | null = null;
private _userInteracting = false;

private static readonly ROTATION_DEG_PER_SEC = 3;
private static readonly ROTATION_SEGMENT_DEG = 60;
private static readonly ROTATION_SEGMENT_MS = 20_000;
private static readonly IDLE_RESUME_MS = 1500;

// Handler — capture FULL viewState verbatim, arm idle timer on user drive
onViewStateChange: ({ viewState, interactionState }) => {
  this._viewState = viewState;
  const userDriven = !!(
    interactionState?.isDragging ||
    interactionState?.isPanning  ||
    interactionState?.isZooming
  );
  if (userDriven) {
    this._userInteracting = true;
    this._armIdleResume();
  }
}

// Rotation — chained segment transitions on deck's native clock
private _scheduleNextSegment(): void {
  if (!this._deck || this._status !== 'ready') return;
  if (this._userInteracting) return;
  if (this._rotationScheduled) return;
  const base = this._viewState ?? INITIAL_VIEW;
  this._rotationScheduled = true;
  this._deck.setProps({
    viewState: {
      ...base,
      longitude: base.longitude + GlobeBridge.ROTATION_SEGMENT_DEG,
      transitionDuration: GlobeBridge.ROTATION_SEGMENT_MS,
      transitionInterpolator: new LinearInterpolator(['longitude']),
      onTransitionEnd: () => {
        this._rotationScheduled = false;
        this._scheduleNextSegment();
      },
      onTransitionInterrupt: () => {
        this._rotationScheduled = false;
        this._userInteracting = true;
        this._armIdleResume();
      },
    },
  });
}

private _armIdleResume(): void {
  if (this._idleResumeTimer !== null) clearTimeout(this._idleResumeTimer);
  this._idleResumeTimer = setTimeout(() => {
    this._idleResumeTimer = null;
    this._userInteracting = false;
    this._scheduleNextSegment();
  }, GlobeBridge.IDLE_RESUME_MS);
}
```

Lifecycle:
- `init()` → after `_status = 'ready'`, call `_scheduleNextSegment()`.
- `suspend()` → clear idle timer, set `_userInteracting = true` (hard-pause; in-flight transition completes naturally, chain doesn't re-arm).
- `resume()` → clear flag, call `_scheduleNextSegment()`.
- `dispose()` → clear idle timer; `_deck.finalize()` tears down in-flight transition.

### Why this is not a workaround
- `LinearInterpolator` + `transitionDuration` / `transitionInterpolator` is **the documented deck.gl API** for animated view state changes.
- Transitions run on deck.gl's internal animation clock, coordinated with the controller by design. User input interrupts cleanly.
- No per-frame writes. No flag polling from rAF. No scalar reassembly.
- The earlier "fixes" (flag gate, debounce) failed because they tried to time-multiplex a loop that shouldn't exist in the first place.

### Superseded commits
- `b67edd1` (Phase 7.3) — rAF loop with `_isInteracting` gate. Zoom broke.
- `eccff9b` (Phase 7.3b) — 300ms debounce. Worse.

Both are preserved on branch `phase7.3-auto-rotation` for history.
