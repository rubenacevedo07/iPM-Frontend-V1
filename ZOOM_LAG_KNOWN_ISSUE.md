# Zoom lag — known issue, deferred to Phase 4

## Symptom
Scroll-wheel zoom on the globe in /workstation feels laggy. Globe pauses ~500ms-1s before snapping to new zoom level instead of responding incrementally.

## Evidence collected 2026-04-17
- test-globe-vanilla.html (pure DeckGL, no React): 58fps smooth zoom
- Same DeckGL config inside React/XState app: zoom laggy
- Conclusion: lag caused by React/XState wiring, not DeckGL/hardware/GPU

## Hypotheses tested (none resolved the lag)
- Stopping rAF in onViewStateChange
- Throttling setProps to 50ms
- Removing hover event emission
- Removing globe-countries GeoJsonLayer

## Unverified hypothesis
- AppShell useSelector re-render cascade
- EngineSlot subscription triggering DOM mutations on every XState snapshot

## Next steps
- Revisit during or after Phase 4 (data layer integration may change render pipeline)
- If persists, profile production build (npm run build) — lag may be dev-mode only
- Consider production profile with React DevTools to identify render cause

## Debugging session 2026-04-17 — ruled out

Instrumented EngineSlot, AppShell, GlobeBridge with [PERF] logs. Collected 
metrics before and after 3 fix attempts.

Confirmed NOT the cause:
- Auto-rotation rAF loop (rotation paused, lag persists)
- DOM mutations in EngineSlot.applyOpacity (prevStateKey guard blocks 
  mutations, lag persists)
- AppShell re-renders during zoom (AppShell renders 1 time, not more)
- XState snapshot emission through subscribe callback (unsubscribe from 
  actor at active.idle made it WORSE due to polling interval overhead)
- globe-countries GeoJsonLayer (commented out, lag persists)
- ENTITY_HOVER emission flood (disabled, lag persists)

Unverified hypotheses for future investigation:
- Vite dev mode overhead (test with `npm run build && npx serve dist`)
- CSS `transition: opacity 400ms` on .engineSlot siblings forcing layout recalc
- React 19 concurrent reconciler interfering with DeckGL canvas
- DeckGL r128 `_GlobeView` + `controller: true` specific known issue

Next session: either fresh eyes with DeckGL GitHub issues search, or proceed 
to Phase 4 and reassess if lag persists with real entities.

## RESOLVED 2026-04-23 — auto-rotation restored via LinearInterpolator (Phase 7.3c)

Root fix: abandoned the rAF + `setProps({viewState})` loop entirely. Auto-rotation
now runs on deck.gl's native transition system using `LinearInterpolator(['longitude'])`
with chained segment transitions. No per-frame writes, no controlled-viewState race.

Mechanism (see `src/engine/GlobeBridge.ts`):
- `_scheduleNextSegment()` sets `viewState` with `transitionDuration=20_000ms`,
  `transitionInterpolator=new LinearInterpolator(['longitude'])`, `onTransitionEnd`
  chaining the next segment, and `onTransitionInterrupt` pausing + arming the
  idle-resume timer.
- `onViewStateChange` captures the full viewState verbatim (no scalar reassembly)
  and only flags `_userInteracting=true` when `interactionState` reports drag/pan/zoom.
- `_armIdleResume()` schedules resumption 1.5s after the last user interaction.

Why this resolves the 2026-04-17 zoom lag:
- deck.gl transitions run on deck's internal animation clock, coordinated with
  the controller. User input interrupts the transition cleanly — the controller's
  proposal becomes the authoritative viewState.
- No competing rAF loop writing `viewState` every 16ms.
- Wheel events that don't set `interactionState.isZooming` still interrupt the
  transition, so the flag-reliability gap is gone.

Failed attempts (branch `phase7.3-auto-rotation`, now superseded):
- `b67edd1` (Phase 7.3): rAF loop with `_isInteracting` flag — zoom broke.
- `eccff9b` (Phase 7.3b): added 300ms debounce on viewState changes — worse.

Both demonstrated that flag/debounce gating cannot resolve the race, because
it's inherent to per-frame controlled-mode writes. The only fix is to not write
viewState per-frame at all.

## RESOLVED 2026-04-17 21:40

Root cause identified: `this._startRotation()` called in `init()` runs a rAF 
loop that calls `this._deck.setProps({ viewState: {...} })` every frame. This 
competes with DeckGL's internal controller during zoom gestures, causing 
~500ms-1s lag.

Fix: commented out `this._startRotation()` in init(). Globe no longer 
auto-rotates but zoom/pan are fluid.

Code evidence: HTML vanilla (no rAF, no React, no XState) ran at 58fps.
Moment of diagnosis: temporarily disabled _startRotation() → zoom became smooth.
2-hour debugging detour in same session: kept trying to coexist rotation with 
zoom via throttling, conditional stops, etc. All failed. Simplest fix was to 
remove the rotation.

Future work: re-enable auto-rotation via non-competing mechanism in Phase 4+.
Candidates: DeckGL's `transitionInterpolator` for gentle one-shot animations, 
or strictly-gated rAF that only activates when interaction has been idle for 
>5 seconds.