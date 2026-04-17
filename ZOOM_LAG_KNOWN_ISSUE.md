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