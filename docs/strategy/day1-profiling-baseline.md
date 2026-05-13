# Day 1 — Profiling Baseline
Date: 2026-05-13  
Branch: `experiment/design-features`  
Mode: mixed evidence (CLI execution + static runtime audit)

## Environment

- OS: Windows (`win32 10.0.26200`)
- Tooling run from repo root:
  - `npm run typecheck` — **historical: FAIL** (`tsc -b --noEmit`, exit 2 at first authoring). **Re-verified 2026-05-13 (post-fix): PASS, 0 errors.**
  - `npm run build` — **historical: FAIL** (`tsc -b && vite build`, exit 2 at first authoring). **Re-verified 2026-05-13 (post-fix): PASS, built in 1m 36s.**
  - `npm test` (Vitest) — added in Day 2. **PASS, 45/45.**
- Canonical runtime protocol source: `docs/PHASE_9.md` + `docs/skills/ipm-engine-runtime.md`
- Authoritative decision record for the GO/NO-GO of this baseline: [day0-day1-go-no-go.md](day0-day1-go-no-go.md).

> The FAIL lines above are preserved because they were the substrate of the
> initial NO-GO. Both checks were re-run after Claude Code's surgical TS fixes
> and the three lifecycle patches landed; current state is green. DevTools
> scenarios A/B/C/D remain pending (ticket `baseline-devtools-run`).

## Scenario A — Cold load + globe idle

Status: **NOT EXECUTED (DevTools required)**  
Reason: this environment does not provide interactive Chrome Performance/Memory capture.

## Scenario B — Single swap cycle (globe ↔ graph)

Status: **NOT EXECUTED (DevTools required)**  
Static finding from Day 0 audit: swap lifecycle has a high-severity rapid-swap risk when `ENGINE.SWAP` arrives during `crossfading`.

**Known defect that will corrupt Scenario B results (must fix before running):**  
`GraphBridge._startLoop()` does not reset `_frameCount` / `_fpsWindowStart` on resume. After the 400ms crossfade settling delay, `t - _fpsWindowStart >= 3` fires on the very first tick with fps ≈ 0, immediately activating degraded mode (pixelRatio=1, 128-node cap, rotation disabled). Any FPS/recovery measurement taken before this fix will reflect degraded-mode behavior, not normal operation. Fix location: [GraphBridge.ts:340](../../src/engine/GraphBridge.ts#L340).

## Scenario C — Stress (50 rapid swaps)

Status: **NOT EXECUTED (DevTools required)**  
Static finding from Day 0 audit: current state machine permits re-entrant swaps before prior `previousBridge` dispose, so stress run is expected to be at risk until lifecycle guarding is added.

## Scenario D — Overlay open/close on globe

Status: **NOT EXECUTED (DevTools required)**  
Static finding: rotation gating in `AppShell` + `GlobeBridge` is explicit and conservative, but FPS impact remains unmeasured on this branch.

## Threshold pass/fail table

| Metric | Target | Result | Status |
|---|---|---|---|
| Globe idle FPS sustained | `>=55 fps` | not measured | FAIL (missing evidence) |
| FPS dip during `ENGINE.SWAP` | `>=30 fps` | not measured | FAIL (missing evidence) |
| FPS recovery after swap | `>=55 fps` | not measured | FAIL (missing evidence) |
| Heap growth after 50 swaps | stable/flat | not measured | FAIL (missing evidence) |
| Detached canvas nodes | `0` | not measured | FAIL (missing evidence) |
| Orphaned workers | `0` | not measured | FAIL (missing evidence) |
| WebGL contexts during crossfade | `<=2` | nominally 2 by design, not measured under stress | FAIL (missing evidence) |
| GraphBridge degraded mode NOT triggered on post-swap resume | false | expected true until FPS-reset bug fixed | FAIL (known defect) |

## Build/typecheck findings affecting baseline confidence

### Original snapshot (NO-GO substrate)

At first authoring the branch had TypeScript/build blockers (representative set):
- `src/app/deriveContextFromSearchParams.ts`: overlay union mismatch (`hq` not in target type)
- `src/components/AtlasTabs/AtlasTabs.tsx`: missing `action` on `TabDef`
- `src/engine/GlobeBridge.ts`: typed input mismatch (`id` number vs expected string in `computeDisplayPositions`)
- `src/engine/graph.worker.ts`: `postMessage` transfer-list overload/type mismatch
- Additional type errors in gold/person/graph feature files

These were resolved in a parallel TS-fix workstream (Claude Code, surgical
patches per file). Re-verification on 2026-05-13 confirms `npm run typecheck`
returns 0 errors and `npm run build` succeeds.

### Lifecycle fixes (Day 0 audit follow-up)

Three High/Medium severity items called out in `day0-engine-audit.md` were
patched in `src/engine/engineManager.machine.ts` and `src/engine/GraphBridge.ts`
under the plan's single-file-bug exception. They unblock Scenarios B and C and
remove the false-degraded-mode risk that would have corrupted Scenario B FPS
metrics.

Branch is now in a stable code shape for the runtime portion of the baseline
to be captured; the only remaining gap is the manual Chrome DevTools run.

## Interpretation and risks

- This baseline is **partial**: build/typecheck/tests are green and lifecycle
  fixes have landed, but browser metrics (Scenarios A/B/C/D) were not captured
  because this environment cannot drive Chrome DevTools.
- Day 7 (performance acceptance) cannot pass without the DevTools run; Day 3 /
  4 / 5 / 6 may proceed in parallel because they do not change rendering hot
  paths. See [day0-day1-go-no-go.md](day0-day1-go-no-go.md) § "What this GO
  authorizes / does NOT authorize".
- When DevTools metrics are collected, append the measured values to each
  Scenario section above; do not edit the thresholds. Reproducibility target:
  ±10% across runs on the same hardware. Branch state at measurement time must
  reference a specific commit so future re-runs can match.
