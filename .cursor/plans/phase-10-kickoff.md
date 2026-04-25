# Phase 10 — kickoff (integration + buffer)

Sprint ref: `docs/skills/ipm-frontend-v1-sprint.md` (Phase 10 row). Phase 9 *code* is on `master`; **GATE C** manual was deferred (see `docs/PHASE_9.md` “Checkpoint deferral”).

## Order of work

1. **Manual GATE C (blocking for ticking Gate in sprint)**  
   - Run the checklist in `docs/PHASE_9.md` §Manual (20× open/close, heap snapshots, **~60 fps** with company overlay + arcs, URL refresh, React warnings).  
   - If numbers look good: update `docs/PHASE_7_DEBT.md` §(f), set **Gates passed: C** `[x]` in the sprint, optional annotated tag (e.g. `v1-phase-9` or `v1-gate-c` — team choice).

2. **Integration + buffer (sprint “Day 12”)**  
   - Triage P0 issues from use (globe, overlays, URL, engine).  
   - Smoke on clean `npm ci` if preparing demo / merge elsewhere.

3. **Not in this phase unless product pulls them in**  
   - Phase 7.1 (persons on globe), 7.2 (country risk), 7b (MapView) — still deferred.

## Pre-flight

- `npx tsc --noEmit` **and** `npm run build` (`tsc -b` + Vite) — must pass for CI / demo (fixed on `master` in the Phase 10 integration pass: PersonOverlay/inspector `EntityRef` alignment, `CompanyMarket` type union, chart stubs, `chart.js` deps).
- `npm run dev` on expected port; backend proxy as in Phase 0
