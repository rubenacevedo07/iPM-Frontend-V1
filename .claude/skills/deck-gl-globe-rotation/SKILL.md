---
name: deck-gl-globe-rotation
description: >
  Canonical pattern for auto-rotation on deck.gl 9 _GlobeView with working
  wheel zoom + drag interaction. Load BEFORE touching GlobeBridge.ts, any
  deck.gl engine bridge, or any globe/map imperative rendering code. Triggers
  on: GlobeBridge, _GlobeView, LinearInterpolator, deck.gl rotation, auto-
  rotate globe, viewState transitions, onTransitionStart, wheel zoom broken,
  controlled mode, writeback pattern, rAF globe, TransitionManager.
  Captures the empirical trap of Phases 7.3c→7.3f (transitions silently
  ignored on globe) and the working rAF + writeback + _selfDriving pattern
  landed in Phase 7.3g.
---

# deck.gl 9 _GlobeView — Auto-rotation Canonical Pattern

## TL;DR

**For continuous rotation on `_GlobeView` in deck.gl 9.3+: use rAF, NOT `LinearInterpolator`.**

The canonical deck.gl transition system (`transitionDuration` +
`transitionInterpolator` inside `viewState`) works on `MapView` but **silently
no-ops on `_GlobeView`** — `onTransitionStart` never fires, frames don't
interpolate, deck commits the target viewState instantly without animation.
This is not documented. Four consecutive phases (7.3c, 7.3d, 7.3e, 7.3f)
chased this dead end before the empirical proof landed: adding
`onTransitionStart` telemetry, seeing it never fire despite `setProps` being
called correctly.

**The working pattern:** rAF loop advancing `longitude` each frame + writeback
in `onViewStateChange` for user gestures + a `_selfDriving` flag to prevent
recursive writeback of our own setProps calls.

---

## The landmines (DO NOT repeat)

### Landmine 1 — `initialViewState` is bootstrap-only

```ts
// WRONG — deck enters uncontrolled mode, later setProps({ viewState })
// commits silently without any transition, even on MapView.
new Deck({ initialViewState: { ... }, controller: true })
```

`initialViewState` seeds deck ONCE. Subsequent writes to `viewState` via
`setProps` do NOT re-trigger transitions; deck just snaps. If you want
controlled mode, pass `viewState` at mount.

### Landmine 2 — `LinearInterpolator` + `_GlobeView` = silent no-op

```ts
// WRONG on _GlobeView (worked on MapView in older tests).
// onTransitionStart NEVER fires. Zero frames. viewState commits instantly.
deck.setProps({
  viewState: {
    ...base,
    longitude: base.longitude + 60,
    transitionDuration: 20_000,
    transitionInterpolator: new LinearInterpolator(['longitude']),
    onTransitionStart: () => console.log('start'), // never runs
    onTransitionEnd:   () => console.log('end'),   // never runs
  },
});
```

Empirically confirmed with telemetry logs: `setProps` call dispatches,
deck receives it, but `GlobeController` does not drive `TransitionManager`
the way `MapController` does. No public issue or doc mentions this as of
deck.gl 9.3.

### Landmine 3 — `interactionState.inTransition` is NOT a real field

deck.gl 9's `InteractionState` type includes `isDragging`, `isPanning`,
`isZooming`, `isRotating` — but NOT `inTransition`. A guard based on
`interactionState?.inTransition` always evaluates falsy and is effectively
removed. Phase 7.3d used this guard; rotation didn't advance because every
interpolated frame writebacked, killing the transition.

### Landmine 4 — Mouse wheel doesn't reliably set `isZooming`

In deck.gl 9, `isZooming` is set for pinch-zoom gestures but NOT consistently
for mouse-wheel events on desktop Chrome. Any guard branching on `isZooming`
will miss wheel input. Use the interrupt-first ordering or a timer-based
heuristic instead of trusting `isZooming`.

### Landmine 5 — Conflating writeback and pause

In controlled mode, `onViewStateChange` fires for:
1. Deck's internal mount handshake (no gesture flags).
2. Our own self-driven `setProps` (no gesture flags, but we caused it).
3. User input (gesture flags SOMETIMES set).

If you set `_userInteracting = true` on ALL non-transition frames (Phase 7.3e
bug), deck's initial mount handshake sets `_userInteracting = true` BEFORE
your rotation-start code runs, and the `_userInteracting` guard blocks it.
Rotation never starts.

**Decouple them.** Writeback always happens (to commit the controller's
proposal in controlled mode). Pause only happens for genuine gestures.

---

## The working pattern (Phase 7.3g)

### Fields on the engine class

```ts
private _deck: Deck<any> | null = null;
private _viewState: any = null;     // full last-known state, never reassembled
private _rafHandle: number | null = null;
private _lastTickMs = 0;
private _selfDriving = false;       // critical: tells onViewStateChange "skip writeback"
private _idleResumeTimer: ReturnType<typeof setTimeout> | null = null;
private _userInteracting = false;

private static readonly ROTATION_DEG_PER_SEC = 3;
private static readonly IDLE_RESUME_MS = 800;
```

### Deck constructor — controlled mode from mount

```ts
this._viewState = { ...INITIAL_VIEW };
this._deck = new Deck({
  canvas, width, height,
  views: new DeckGlobeView({ id: 'globe' }),
  viewState: { ...INITIAL_VIEW }, // CONTROLLED — not initialViewState
  controller: true,
  layers: this._buildLayers(),
  onViewStateChange: ({ viewState, interactionState }: any) => {
    // (1) Our own rAF tick — capture state, no writeback (would recurse).
    if (this._selfDriving) {
      this._viewState = viewState;
      return;
    }
    // (2) User input or deck internal — writeback to commit in controlled mode.
    this._viewState = viewState;
    this._deck?.setProps({ viewState });
    // (3) Pause rotation ONLY for genuine gestures, not mount handshake.
    const userDriven = !!(
      interactionState?.isDragging ||
      interactionState?.isPanning  ||
      interactionState?.isZooming  ||
      interactionState?.isRotating
    );
    // `_idleResumeTimer !== null` catches wheel-chain follow-ups when
    // isZooming fails to fire — a prior gesture armed the timer, subsequent
    // wheel frames extend it.
    if (userDriven || this._idleResumeTimer !== null) {
      this._userInteracting = true;
      this._armIdleResume();
    }
  },
  onClick: ..., onHover: ...,
});
```

### rAF rotation loop

```ts
private _startRAFRotation(): void {
  if (this._rafHandle !== null) return;
  this._lastTickMs = 0;

  const tick = (ts: number) => {
    this._rafHandle = requestAnimationFrame(tick);
    if (!this._deck || this._status !== 'ready') {
      this._lastTickMs = ts; return;
    }
    if (this._userInteracting) {
      this._lastTickMs = ts; return;
    }
    const dt = this._lastTickMs === 0 ? 0 : (ts - this._lastTickMs) / 1000;
    this._lastTickMs = ts;

    const base = this._viewState ?? INITIAL_VIEW;
    const newLng = base.longitude + GlobeBridge.ROTATION_DEG_PER_SEC * dt;

    // CRITICAL ordering: raise _selfDriving BEFORE setProps, lower AFTER.
    // In controlled mode, onViewStateChange fires synchronously inside
    // setProps, so the flag is observable when the handler runs.
    this._selfDriving = true;
    this._deck.setProps({ viewState: { ...base, longitude: newLng } });
    this._selfDriving = false;

    // Belt-and-braces: update _viewState here too in case deck short-circuits
    // onViewStateChange (e.g., deep-equal with prior state under edge cases).
    this._viewState = { ...base, longitude: newLng };
  };

  this._rafHandle = requestAnimationFrame(tick);
}

private _stopRAFRotation(): void {
  if (this._rafHandle !== null) cancelAnimationFrame(this._rafHandle);
  this._rafHandle = null;
  this._lastTickMs = 0;
}
```

### Idle-resume timer

```ts
private _armIdleResume(): void {
  if (this._idleResumeTimer !== null) clearTimeout(this._idleResumeTimer);
  this._idleResumeTimer = setTimeout(() => {
    this._idleResumeTimer = null;
    this._userInteracting = false;
    this._lastTickMs = 0; // reset dt so first resumed frame doesn't jump
  }, GlobeBridge.IDLE_RESUME_MS);
}
```

### Lifecycle wiring

```ts
// init() — after status='ready'
this._startRAFRotation();

// suspend()
this._userInteracting = true;
this._stopRAFRotation();

// resume()
if (this._status !== 'ready') return;
this._userInteracting = false;
this._startRAFRotation();

// dispose()
this._stopRAFRotation();
// ... rest of teardown
```

---

## Why this works

| Concern | Resolution |
|---|---|
| rAF setProps clobbers wheel zoom (original 7.3 bug) | onViewStateChange writebacks user proposals to deck BEFORE the next rAF tick reads `_viewState`. User input persists through the rotation loop. |
| Writeback causes infinite recursion | `_selfDriving` flag is true during our `setProps`; onViewStateChange sees it and returns without writeback. |
| Flag not observable when handler runs | onViewStateChange fires SYNCHRONOUSLY inside setProps in controlled mode. Raise → setProps → lower sequence is atomic from the handler's POV. |
| `isZooming` unreliable for wheel | Wheel during idle: the first wheel event fires gesture flags (via controller processing) OR lands while timer is already armed from prior input. `userDriven \|\| _idleResumeTimer !== null` catches both. |
| Mount handshake pauses rotation | Pause branch guarded by `userDriven \|\| _idleResumeTimer !== null`. At mount, both are false → no pause. |

---

## Debugging protocol for "rotation broken" incidents

If a future change breaks rotation, run this telemetry BEFORE trying fixes:

```ts
// 1. In onViewStateChange — detect which frame source is firing
console.log('[globe] onViewStateChange', {
  longitude: viewState?.longitude,
  zoom: viewState?.zoom,
  interactionState,
  selfDriving: this._selfDriving,
});

// 2. In rAF tick — confirm the loop is alive and not bailing
console.log('[globe] tick', {
  dt, userInteracting: this._userInteracting, longitude: newLng,
});
```

Interpretation:
- No `[globe] tick` logs at all → rAF loop never started. Check `_startRAFRotation` called after `status='ready'`.
- `tick` logs but longitude never advances → `_userInteracting` stuck true. Check mount handshake isn't pausing.
- `tick` logs advancing but globe static → setProps not taking effect. Check deck instance valid, controller enabled.
- `onViewStateChange` floods with `selfDriving: false` after each tick → recursion; check flag raise/lower order.

---

## What NOT to try (confirmed dead ends)

| Attempt | Tag | Outcome |
|---|---|---|
| rAF loop, no writeback | `v1-phase-7.3` (b67edd1) | Rotation OK, wheel zoom silently fails |
| rAF + 300ms debounce on viewState | `v1-phase-7.3b` (eccff9b) | Worse — user interaction even more laggy |
| `LinearInterpolator` + `initialViewState` | `v1-phase-7.3c` (c02f57c) | No rotation, no zoom |
| Same + `inTransition` guard | 7.3d attempt | Zoom works, no rotation (vacuous guard) |
| Same + `_rotationScheduled` flag guard | 7.3e attempt | Zoom works, no rotation (mount handshake pause bug) |
| Same + decoupled writeback/pause | 7.3f attempt | Zoom works, no rotation — confirmed `onTransitionStart` never fires on _GlobeView |
| rAF + writeback + `_selfDriving` flag | **7.3g (WORKING)** | Rotation + zoom + drag all work |

---

## Architectural constraints preserved

- **Rule 5** (no R3F, no `<DeckGL />` reconciler): `new Deck({...})` + `deck.setProps({...})` only. This pattern honors it.
- **`IEngineBridge` contract**: `init`/`send`/`onEvent`/`status`/`suspend`/`resume`/`dispose` semantics unchanged.
- **Rule 6** (no canonical v3 refactor): `GlobeBridge.ts` is V1-authored, editable.

---

## Related files

- `src/engine/GlobeBridge.ts` — the imperative bridge
- `src/engine/contracts/bridge.ts` — `IEngineBridge` interface
- `docs/PHASE_7.3_AUTO_ROTATION_HANDOFF.md` — historical resolution record
- `ZOOM_LAG_KNOWN_ISSUE.md` — root cause notes for wheel zoom

## When this skill applies

Load BEFORE any edit that touches:
- Auto-rotation logic in `GlobeBridge.ts`
- Any new imperative deck.gl engine bridge (same trap will apply to map/orbit views on older deck versions)
- `onViewStateChange` handlers in controlled mode
- Any attempt to add a rotation "enhancement" like easing, variable speed, or path-following
