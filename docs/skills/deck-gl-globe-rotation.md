# deck.gl 9 _GlobeView — Auto-rotation Canonical Pattern

> **Trigger this skill when:** editing `src/engine/GlobeBridge.ts`, writing any imperative deck.gl engine bridge, touching `onViewStateChange`, debugging "rotation broken" / "zoom broken" / "wheel not working" on the globe, or evaluating any rotation enhancement (easing, variable speed, path-following).
>
> **Parent**: `CLAUDE.md` — skill hierarchy entry "When working on engines/runtime".
> **Mirror**: `.claude/skills/deck-gl-globe-rotation/SKILL.md` (Cursor-agent activation).

---

## TL;DR

**For continuous rotation on `_GlobeView` in deck.gl 9.3+: use rAF, NOT `LinearInterpolator`.**

The canonical deck.gl transition system (`transitionDuration` + `transitionInterpolator` inside `viewState`) works on `MapView` but **silently no-ops on `_GlobeView`** — `onTransitionStart` never fires, frames don't interpolate, deck commits the target viewState instantly without animation. This is not documented. Four consecutive phases (7.3c, 7.3d, 7.3e, 7.3f) chased this dead end before the empirical proof landed: adding `onTransitionStart` telemetry and seeing it never fire despite `setProps` being dispatched correctly.

**The working pattern (7.3g):** rAF loop advancing `longitude` each frame + writeback in `onViewStateChange` for user gestures + a `_selfDriving` flag to prevent recursive writeback of our own setProps calls.

---

## The 5 landmines (confirmed empirically — do NOT repeat)

### Landmine 1 — `initialViewState` is bootstrap-only

```ts
// WRONG — deck enters uncontrolled mode; later setProps({ viewState })
// commits silently without transitions.
new Deck({ initialViewState: { ... }, controller: true })
```

`initialViewState` seeds deck ONCE. Subsequent writes to `viewState` via `setProps` do NOT re-trigger transitions; deck just snaps. If you want controlled mode, pass `viewState` at mount.

### Landmine 2 — `LinearInterpolator` + `_GlobeView` = silent no-op

```ts
// onTransitionStart NEVER fires on _GlobeView. Zero frames. viewState commits instantly.
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

`GlobeController` does not drive `TransitionManager` the way `MapController` does. No public deck.gl issue or doc mentions this as of 9.3.

### Landmine 3 — `interactionState.inTransition` is NOT a real field

deck.gl 9's `InteractionState` includes `isDragging`, `isPanning`, `isZooming`, `isRotating` — but NOT `inTransition`. Any guard based on `interactionState?.inTransition` always evaluates falsy and is effectively removed.

### Landmine 4 — Mouse wheel doesn't reliably set `isZooming`

`isZooming` is set for pinch gestures but NOT consistently for mouse-wheel on desktop Chrome. Any guard branching on `isZooming` will miss wheel input. Use interrupt-first ordering or a timer-armed heuristic.

### Landmine 5 — Conflating writeback and pause

In controlled mode, `onViewStateChange` fires for:
1. Deck's internal mount handshake (no gesture flags).
2. Our own self-driven `setProps` (no gesture flags, but we caused it).
3. User input (gesture flags SOMETIMES set).

If you set `_userInteracting = true` on ALL non-transition frames, the mount handshake pauses rotation BEFORE it starts. Decouple writeback from pause.

---

## The working pattern (Phase 7.3g) — reference code

### Engine class fields

```ts
private _deck: Deck<any> | null = null;
private _viewState: any = null;        // full last-known state
private _rafHandle: number | null = null;
private _lastTickMs = 0;
private _selfDriving = false;          // critical: "this setProps is mine, don't writeback"
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
  viewState: { ...INITIAL_VIEW },       // CONTROLLED — not initialViewState
  controller: true,
  layers: this._buildLayers(),
  onViewStateChange: ({ viewState, interactionState }: any) => {
    // (1) rAF self-driven frame: capture, no writeback (would recurse).
    if (this._selfDriving) {
      this._viewState = viewState;
      return;
    }
    // (2) User input or deck internal: writeback to commit in controlled mode.
    this._viewState = viewState;
    this._deck?.setProps({ viewState });
    // (3) Pause ONLY for genuine gestures; NOT mount handshake.
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
});
```

### rAF rotation loop

```ts
private _startRAFRotation(): void {
  if (this._rafHandle !== null) return;
  this._lastTickMs = 0;

  const tick = (ts: number) => {
    this._rafHandle = requestAnimationFrame(tick);
    if (!this._deck || this._status !== 'ready') { this._lastTickMs = ts; return; }
    if (this._userInteracting) { this._lastTickMs = ts; return; }

    const dt = this._lastTickMs === 0 ? 0 : (ts - this._lastTickMs) / 1000;
    this._lastTickMs = ts;
    const base = this._viewState ?? INITIAL_VIEW;
    const newLng = base.longitude + GlobeBridge.ROTATION_DEG_PER_SEC * dt;

    // CRITICAL ordering: flag BEFORE setProps, unflag AFTER. onViewStateChange
    // fires synchronously inside setProps in controlled mode.
    this._selfDriving = true;
    this._deck.setProps({ viewState: { ...base, longitude: newLng } });
    this._selfDriving = false;

    this._viewState = { ...base, longitude: newLng };
  };

  this._rafHandle = requestAnimationFrame(tick);
}

private _stopRAFRotation(): void {
  if (this._rafHandle !== null) cancelAnimationFrame(this._rafHandle);
  this._rafHandle = null;
  this._lastTickMs = 0;
}

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
```

---

## Why this works

| Concern | Resolution |
|---|---|
| rAF `setProps` clobbers wheel zoom (original 7.3 bug) | `onViewStateChange` writebacks user proposals BEFORE the next rAF tick reads `_viewState`. User input persists through the rotation loop. |
| Writeback causes infinite recursion | `_selfDriving` flag is true during our `setProps`; `onViewStateChange` sees it and returns without writeback. |
| Flag not observable when handler runs | `onViewStateChange` fires SYNCHRONOUSLY inside `setProps` in controlled mode. Raise → setProps → lower is atomic from the handler's POV. |
| `isZooming` unreliable for wheel | `userDriven \|\| _idleResumeTimer !== null` catches wheel-chain follow-ups when a prior gesture armed the timer. |
| Mount handshake pauses rotation | Pause branch guarded by same condition. At mount, `userDriven=false` and `_idleResumeTimer=null` → no pause. |

---

## Debugging protocol for "rotation broken" incidents

Run this telemetry BEFORE trying fixes. Four runs of 7.3d-7.3f were burned by NOT doing this first; the `onTransitionStart`-never-fires signal was the smoking gun that saved 7.3g.

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

Interpretation:
| Symptom in logs | Root cause |
|---|---|
| No `[globe] tick` logs at all | rAF loop never started. Check `_startRAFRotation` called after `status='ready'`. |
| `tick` logs but longitude never advances | `_userInteracting` stuck true. Check mount handshake isn't pausing. |
| `tick` logs advancing but globe static | setProps not taking effect. Check deck instance valid, controller enabled, canvas attached. |
| `onViewStateChange` floods with `selfDriving: false` after each tick | Recursion — check flag raise/lower order. |
| Zero `onTransitionStart` logs when using LinearInterpolator | You hit Landmine 2. Pivot to rAF. |

---

## What NOT to try (confirmed dead ends)

| Attempt | Tag | Outcome |
|---|---|---|
| rAF loop, no writeback | `v1-phase-7.3` (b67edd1) | Rotation OK, wheel zoom silently fails |
| rAF + 300ms debounce on viewState | `v1-phase-7.3b` (eccff9b) | Worse — user interaction even more laggy |
| `LinearInterpolator` + `initialViewState` | `v1-phase-7.3c` (c02f57c) | No rotation, no zoom |
| Same + `inTransition` guard | 7.3d attempt | Zoom works, no rotation (vacuous guard — Landmine 3) |
| Same + `_rotationScheduled` flag guard | 7.3e attempt | Zoom works, no rotation (Landmine 5 — mount handshake pause) |
| Same + decoupled writeback/pause | 7.3f attempt | Zoom works, no rotation — confirmed `onTransitionStart` never fires (Landmine 2) |
| **rAF + writeback + `_selfDriving`** | **7.3g WORKING** | Rotation + zoom + drag all work |

---

## Architectural constraints preserved

- **Rule 5** (no R3F, no `<DeckGL />` reconciler): `new Deck({...})` + `deck.setProps({...})` only. This pattern honors it.
- **`IEngineBridge` contract**: `init`/`send`/`onEvent`/`status`/`suspend`/`resume`/`dispose` semantics unchanged.
- **Rule 6** (no canonical v3 refactor): `GlobeBridge.ts` is V1-authored, editable.

---

## Related files

- `src/engine/GlobeBridge.ts` — the imperative bridge (reference implementation)
- `src/engine/contracts/bridge.ts` — `IEngineBridge` interface
- `docs/PHASE_7.3_AUTO_ROTATION_HANDOFF.md` — historical resolution record
- `ZOOM_LAG_KNOWN_ISSUE.md` — root-cause notes for wheel zoom

---

## Budget targets (from CLAUDE.md globe layer budget)

- Target: sustained 60fps on rotation with all layers active.
- Entity dots: ~100 total (30 persons + 30 companies + 40 chokepoints).
- If framerate drops below 50fps, reduce dot count BEFORE adding layer optimization.
- rAF-based rotation is measured at 60fps with 30 company dots + countries fill in Phase 7.3g.
