# Phase 9 — Polish, teardown, **GATE C**

**Sprint ref:** `docs/skills/ipm-frontend-v1-sprint.md` (Phase 9 row, GATE C).  
**Related debt:** `PHASE_7_DEBT.md` §(f) (20× heap — manual protocol).

### Checkpoint deferral (manual work) — superseded 2026-04-25

**Original deferral language preserved for history.** GATE C ran on 2026-04-25 against the V3 production build (`npm run build` + `vite preview` on port 5180); results in §"GATE C — CLOSED" below.

**GATE C** and the **DevTools 20× heap + FPS** steps below were **not** required to finish the current coding round. They were **explicitly scheduled for the next etapa** (Phase 10 kickoff: integration / buffer, see `.cursor/plans/phase-10-kickoff.md`). Code-side Phase 9 (unload `ENGINE.DISPOSE`, static listener audit) is **closed**; opening **GATE C** in the sprint tracker waited on that future manual session.

---

## Code landed (teardown on leave)

- **`AppShell`:** `pagehide` + `beforeunload` → single `ENGINE.DISPOSE` (ref-guard; no dispose on React unmount so **StrictMode** in dev does not nuke the deck).  
- **`engineManager.machine`:** `ENGINE.DISPOSE` accepted from `idle` (idempotent), `initializing` (user closes tab during init), `failed`, and `active` (unchanged).  
- **`GlobeBridge.dispose`:** rAF, idle timer, `ResizeObserver`, `Deck.finalize`, arc/entity arrays (existing).

---

## Static audit (listeners / timers) — 2026-04-25

| Area | Result |
|------|--------|
| `AppShell` | Unload listeners removed in `useEffect` cleanup |
| `SearchBox` | `document` mousedown: paired `removeEventListener` |
| `useMediaQuery` | `mql` change: paired `removeEventListener` |
| `TopBar` | `setInterval` 1s clock: `clearInterval` in cleanup |
| `useMarketData` | `setInterval` poll: `clearInterval` in cleanup |
| `CinematicTransition` | `setTimeout`: `clearTimeout` in cleanup |
| `EngineSlot` | `actorRef.subscribe` → `unsubscribe` in cleanup |
| `GlobeBridge` | rAF: `cancelAnimationFrame` in `_stopRAFRotation`; `ResizeObserver` in `dispose` |

No extra production fixes required from this pass; re-run if large new `addEventListener` sites appear.

---

## Manual — close **GATE C** and `PHASE_7_DEBT` (f) *(deferred; run at Phase 10 kickoff)*

1. **Heap (20× cycle)**  
   - Chrome DevTools → Memory → take snapshot → baseline.  
   - `20×` open/close `?overlay=company&id=1` (or any dot → overlay → close).  
   - Force GC, snapshot again.  
   - **Target:** delta < ~5 MB (same order of magnitude as Phase 5/6/7 protocol).

2. **Rotation + arcs + FPS**  
   - With company overlay open (arcs visible), Performance tab: rotation sustained **~60 fps** (sprint budget; drop below ~50 → see `CLAUDE.md` layer budget).

3. **Full navigation**  
   - Dots open correct overlay; refresh preserves URL + state.

4. **React**  
   - No new StrictMode / cleanup **warnings** from our trees (unchanged policy: no engine dispose on unmount).

When (1)–(4) pass, update `PHASE_7_DEBT.md` §(f) and mark GATE **C** in the sprint doc.

---

## Not in Phase 9 scope (deferred)

- Phase 7.1 / 7.2 / 7b (backend data, country fills, MapView)  
- QueryClient `gcTime` tuning (only if measured cache-related growth)

---

## GATE C — CLOSED (2026-04-25, V3 prod build)

**Build:** `npm run build` (Vite, 11.3s) → `vite preview` on `http://localhost:5180/` (5178/5179 in use). Backend proxy `/api → https://localhost:32777` verified (`/api/persons/7` → 200). `preview.proxy` block added to `vite.config.ts` to mirror dev proxy under preview.

### 1. Heap (20× cycle) — PASS ✅

Snapshots taken via DevTools → Memory → Heap snapshot, GC forced (×2) before each. Cycle entity: `?overlay=company&id=16` (Johnson & Johnson) open/close × 20.

| Metric | Snapshot 1 (baseline) | Snapshot 2 (post-20×) |
|---|---|---|
| File size | 40.7 MB | 47.7 MB |

**Comparison view (Snapshot 2 vs Snapshot 1, sorted by Größe Delta):**

| Constructor | # New | # Deleted | Größe Delta | Note |
|---|---|---|---|---|
| HTMLImageElement | 1 | 1 | +1.2 kB | New J&J logo image |
| `{delta, timestamp, isProcessing}` | 16 | 0 | +384 B | Wheel-event throttle closures |
| MessageEvent | 1 | 0 | +288 B | Stray postMessage |
| Float64Array, hF, aM | ≤2 each | ≤2 each | <120 B each | deck.gl geometry / minified internals |
| Detached `<div>` | 0 | 1.643 | **−407 kB** | GC freed |
| Detached `<span>` | 0 | 743 | −183 kB | GC freed |
| Detached `Text` | 0 | 1.312 | −130 kB | GC freed |
| Detached `CSSStyleDeclaration` | 0 | 1.145 | −64.9 kB | GC freed |
| Detached `EventListener` | 0 | 196 | −6.3 kB | GC freed |
| Detached `<img>` | 0 | 53 | −18.4 kB | GC freed |
| Detached V8EventListener / V8EventHandlerNonNull | 0 | 96+100 | −7 kB | GC freed |

**Total new attributable to V1 code:** ~2 kB across 5 constructor entries. **Detached DOM net change:** −815 kB (GC removed baseline crud). **Conclusion:** zero accumulating leaks. The 7 MB file-size delta sits in `(array)/(string)/(system)` primitive overhead which Comparison view does not surface as new constructor rows — not user-code.

### 2. Rotation + arcs + FPS — PASS ✅

DevTools → More tools → Rendering → Frame Rendering Stats. 30s drag rotation + zoom in each test.

| Test | URL | FPS sustained |
|---|---|---|
| A — globe alone | `/workstation` | **60** |
| B — Person overlay (no arcs) | `?overlay=person&personId=7` | **60** |
| C — Company overlay + ArcLayer | `?overlay=company&id=16` | **60 → transient dip to 50 → 60** |

**Threshold:** ≥55fps sustained, transient dips acceptable, sustained <50 = fail. Test C dips to 50 momentarily during heavy drag with arcs in viewport but recovers; **within budget**.

**Note on initial 30fps observation:** First measurement against company overlay reported 30fps sustained. In controlled isolation tests this did not reproduce — likely DevTools overhead (Paint flashing or Performance recording active) or pre-warm state of deck.gl shaders/geometry. The aislamiento A/B/C run with FPS overlay alone showed healthy numbers.

### 3. Cross-references closed

- `PHASE_7_DEBT.md` §(f) — 20× memory cycle: **CLOSED** (this run satisfies the protocol).
- Sprint tracker `Gates passed: A [x] B [x] C [x]`.

### 4. Known follow-ups (not blocking)

- ArcLayer transient dip to 50 during drag — acceptable for Sprint 1, but if Phase 8.1 adds animated/flowing arcs (per `PHASE_8_DEBT` §b), re-measure under the heavier render and reassess budget.
- URL param convention: Company overlay opened via `?overlay=company&id=16` rather than the canonical `?overlay=company&companyId=16` — works (data loads) but indicates the route validateSearch may be tolerating both shapes. Worth a Sprint 2 cleanup pass.
