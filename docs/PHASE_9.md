# Phase 9 — Polish, teardown, **GATE C**

**Sprint ref:** `docs/skills/ipm-frontend-v1-sprint.md` (Phase 9 row, GATE C).  
**Related debt:** `PHASE_7_DEBT.md` §(f) (20× heap — manual protocol).

### Checkpoint deferral (manual work)

**GATE C** and the **DevTools 20× heap + FPS** steps below are **not** required to finish the current coding round. They are **explicitly scheduled for the next etapa** (Phase 10 kickoff: integration / buffer, see `.cursor/plans/phase-10-kickoff.md`). Code-side Phase 9 (unload `ENGINE.DISPOSE`, static listener audit) is **closed**; opening **GATE C** in the sprint tracker waits on that future manual session.

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
