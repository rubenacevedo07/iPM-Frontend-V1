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
