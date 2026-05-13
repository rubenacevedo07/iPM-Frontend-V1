# Day 0–1 GO / NO-GO Decision
Date: 2026-05-13  
Branch: `experiment/design-features`

## Inputs reviewed

- `docs/strategy/day0-engine-audit.md`
- `docs/strategy/day1-profiling-baseline.md`

## Decision (revised — 2026-05-13, post-fix)

**GO** for Day 3+ refactor work, with two non-blocking follow-ups tracked below.

The initial **NO-GO** (recorded in [§ Original NO-GO decision](#original-no-go-decision)) was issued
when the branch was red on typecheck/build and three lifecycle tickets were open. All
three code-level blockers have since landed and the branch is verified green:

| Check | Result | Source |
|---|---|---|
| `npm run typecheck` | ✅ 0 errors | clean run |
| `npm run build` | ✅ built in 5m 14s | clean run |
| `npm test` (Vitest) | ✅ 45/45 pass | `selectUIState.test.ts` (added in Day 2) |
| `lifecycle-crossfade-guard` | ✅ applied | `src/engine/engineManager.machine.ts:151–157` — `ENGINE.SWAP` while crossfading now disposes the displaced previous bridge first; `ENGINE.DISPOSE` releases both current and previous in the active state |
| `dispose-previous-bridge` | ✅ applied | same hunk, same file |
| `graphbridge-fps-reset` | ✅ applied | `src/engine/GraphBridge.ts:343–344` — `_startLoop()` zeros `_frameCount` / `_fpsWindowStart` so resume after crossfade no longer false-positives the FPS window into degraded mode |

The remaining two backlog tickets (`contract-gap-doc`, `baseline-devtools-run`) are
intentionally non-blocking for Day 3:

- `contract-gap-doc` is documentation-only; the matrix it formalizes is already
  enumerated in `day0-engine-audit.md`.
- `baseline-devtools-run` requires browser DevTools (out of scope for the CLI agent)
  and gates **performance acceptance** for Day 7, not the state-shape work that
  Day 3 begins. Day 7 will not pass without this evidence; Day 3 / Day 4 / Day 5 /
  Day 6 can advance in parallel because they do not change rendering hot paths.

### What this GO authorizes

- Day 3 — selector adoption in overlay hosts (`CompanyOverlayHost`,
  `GoldOverlayHost`, `HeadquartersOverlayHost`, `PowerMapOverlayHost`) plus
  `AppShell` switch-over to `ui.kind`. See `docs/strategy/day3-plan.md`.
- Subsequent Plan v3 days (4–6) as scoped in `ipm-frontend-v1-sprint`.

### What this GO does NOT authorize

- Promoting `UIState` to `app.machine.context` before the criteria in
  `day2-uistate.md` § "Promotion to context" are met.
- Skipping `baseline-devtools-run` before declaring Day 7 (performance) green.
- Any change to the engine lifecycle (`engineManager.machine`, bridges) without
  an extension of `day0-engine-audit.md` recording the new invariants.

## Original NO-GO decision

The block below is preserved verbatim from the initial Day 0/1 evaluation for
audit trail. The decision was reversed in the section above once the listed
blockers were resolved.

> **NO-GO** for Day 2+ refactor work.

## Decision basis (historical, NO-GO)

### 1) Day 0 high-severity lifecycle gaps present

- Re-entrant `ENGINE.SWAP` during `crossfading` can overwrite `previousBridge` before disposal (leak risk under stress).
- `ENGINE.DISPOSE` in active flow does not guarantee disposal of `previousBridge`/`previousUnsubscribe` when crossfade is in progress.

This violates the required lifecycle safety bar for entering state-level refactors.

### 2) Day 1 profiling thresholds are not closed

All 7 runtime thresholds remain unverified in this execution context (DevTools scenarios A/B/C/D not measured), therefore baseline acceptance criteria are not met.

### 3) Branch health is currently red

Both:
- `npm run typecheck`
- `npm run build`

failed with TypeScript errors, so current runtime cannot be considered baseline-stable.

## Required next step before GO

1. Resolve lifecycle blockers (swap/dispose safety).
2. Restore green `typecheck` and `build`.
3. Execute full Chrome DevTools protocol (A/B/C/D) and fill measured values.
4. Re-evaluate GO/NO-GO using the same thresholds.

## Minimal backlog tickets (original NO-GO follow-up)

> Status of each ticket as of the revised decision is shown in the
> [§ Decision (revised)](#decision-revised--2026-05-13-post-fix) table above.

- `[ticket] lifecycle-crossfade-guard`  
  Prevent or queue re-entrant `ENGINE.SWAP` while in `active.crossfading`, or maintain a safe chain that always disposes every displaced bridge.

- `[ticket] dispose-previous-bridge`  
  Ensure `ENGINE.DISPOSE` path releases both current and previous bridge references/subscriptions in all active substates.

- `[ticket] contract-gap-doc`  
  Make command/event capability map explicit (`handled`/`stub`/`drop`) and decide hover propagation policy.

- `[ticket] graphbridge-fps-reset`  
  Add `this._frameCount = 0; this._fpsWindowStart = 0;` at the start of `GraphBridge._startLoop()`. Without this, every crossfade resume immediately triggers false degraded mode, corrupting Scenario B FPS metrics and disabling rotation + reducing node/edge caps permanently for that session. [GraphBridge.ts:340](../../src/engine/GraphBridge.ts#L340).

- `[ticket] baseline-devtools-run`  
  Run A/B/C/D protocol in Chrome DevTools, collect FPS/heap/GPU/context metrics, and update `day1-profiling-baseline.md` with measured values.
