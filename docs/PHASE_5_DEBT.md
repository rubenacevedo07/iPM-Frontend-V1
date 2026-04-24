# Phase 5 — Technical Debt Log

**Branch:** `phase5-v3port`
**Tag:** `v1-phase-5`
**Scope closed:** v3 canonical (`IPM_Frontend/src/features/company-overlay/globalCompanies/`) ported verbatim + V1 host orchestrator composing HeaderRow + SubHeaderRow + FirstPanel + SecondPanel.

---

## (a) Rule 3 CI gate — deferred post-Phase-9

**Rule:** Components must NEVER call `router.navigate()` or `useNavigate()` directly. All URL mutations route through `navigationActor`.

**Enforcement gap:** No CI check mechanically enforces this. Today it's convention-only.

**Gate to add post-Phase-9:**
```
grep -rn "router\.navigate\|useNavigate" src/ must return empty
```
(Exclude navigationActor itself + router configuration.)

**Why deferred:** CI infra belongs to a dedicated polish phase; Phase 5 focus was overlay restoration.

---

## (b) Request-race mitigation — pending Phase 2 workers

**Risk:** Rapid company A→B navigation (user clicks company X then Y before X's fetch completes) can race the two fetches; the in-flight response for X may arrive after Y and overwrite Y's state.

**Current state:** V1's `useCompanyById` uses a hand-rolled `useService` pattern (see `src/hooks/_useService.ts`). It cancels the *previous* fetch on re-run via `let cancelled = true` closure, which guards against out-of-order state writes. That's the minimum.

**Remaining gap:** No AbortController on fetch itself — network request still completes, just result is discarded. Sub-optimal but not buggy.

**Resolution:** Phase 2 workers (Sprint 2) will introduce TanStack Query with key-based cancellation + AbortSignal. No patch in Phase 5.

---

## (c) CSS leak audit — pending Phase 9

**Weight of global stylesheets now loaded:**
- `src/app/styles/global.scss` — 25 KB (v3 verbatim, ~1285 lines)
- `src/app/styles/overlay.scss` — 53 KB (v3 verbatim, transitive via panel imports)
- `src/app/styles/overlay-legacy.scss` — 53 KB (v3 verbatim, transitive via global.scss:1285)
- `src/app/styles/company-overlay.scss` — 8.6 KB (v3 verbatim, via CompanyLogo.canonical.tsx)

Total **~140 KB of unscoped global CSS** carrying hundreds of classes (`.co-*`, `.ov__*`, `.cin__*`, `.mp__*`, `.app-shell`, etc.).

**Risk:** Selectors may leak into engine/globe layer, future overlays, or shell chrome. Particularly `*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box }` in global.scss applies aggressively.

**Audit to do in Phase 9:** Scope classes to their modules (CSS modules, `:where()`, `@scope`, or manual prefix refactor). Rule 6 forbids editing canonical during sprint 1, so refactor waits for v1-phase-5 window close.

---

## (d) 20× cycle memory test

**Protocol:** Open/close `?overlay=company&id=1` 20 times via browser, force GC via DevTools Memory → Heap snapshot, measure residual delta. Threshold: `<5 MB` pass.

**Measurement — 2026-04-24:**
- Baseline heap (pre-cycle): **29.000 MB**
- Final heap (post-20× + forced GC): **34.114 MB**
- **Delta: 5.114 MB — borderline FAIL** (over 5.0 MB threshold by ~2%)

**Interpretation:** Delta is within typical heap-snapshot variance (±10%) so this is not a strong signal of a true leak — but it's above the zero-tolerance threshold and should be re-audited rather than dismissed.

**Suspected sources to audit in Phase 9:**
- `framer-motion` AnimatePresence keyed remounts on every `activeTab` change (4 panels re-keyed = 4 listener sets per tab swap, 80 total across 20 cycles)
- `useService` closure-based cleanup in V1 hooks — `cancelled = true` flag discards results but doesn't abort the fetch itself; subscriptions to `AbortController`-less XHR may pile up
- `SearchBox.tsx:28` `document.addEventListener('mousedown', ...)` cleanup exists but SearchBox is orphan (never rendered from host) — non-factor today, will matter if SearchBox is wired later
- ResizeObserver / IntersectionObserver usage in canonical panels (not audited)
- Google Fonts CSS request chain — not normally a heap source, mentioned for completeness

**Action for Phase 9:**
1. Rerun with longer cycle (50× or 100×) to amplify signal vs noise
2. Use DevTools → Performance → Allocation sampling to pinpoint retainers
3. Audit listener cleanup in canonical panels (requires Rule 6 bend if fix needed)

---

## (e) V1 `index.css` :root font-size removed

**Before:** `src/index.css:4` had `:root { font-size: 14px }` (V1-only scaffold, not in canonical).
**After:** Line removed during Phase 5. Browser default 16px applies, matching v3 baseline.

**Why it mattered:** Elements without an explicit `font-size` inherit from the closest styled ancestor. With V1's 14px override, inherited text rendered 12.5% smaller than v3 for those elements (not the panel text itself — panel uses literal px — but for anything else that cascades).

**Rule for future:** Any new root-level CSS rule in V1 that diverges from canonical must be justified with a commit-message rationale and documented here. Default stance: **match canonical cascade unless there's a specific reason**.

---

## (f) Globe entity highlighting + ArcLayer for company network

**Gap:** When a company overlay is open, the NETWORK column shows TOP SUPPLIERS + TOP CLIENTS in the right panel, but the **globe does not visualize these connections** — no colored dots for supplier/client/facility locations, no arcs supplier→company→client.

**Scope attribution per sprint plan:**
- **Phase 7** — Globe layers with real data (~100 entity dots + click handlers, 4h)
- **Phase 8** — ArcLayer (animated arcs for AI supply chain, 3h)

**Data pipeline already in place:** `CompanyOverlayHost.tsx` already fetches `useCompanyProviders(id)` + `useCompanyClients(id)` + `useCompanyMarkets(id)`. Phase 7/8 wires these into engine layer updates (e.g., `engineRef.send({ type: 'CMD.SET_ENTITIES', data: { focus: ... } })`).

**Intentionally deferred.** Closing Phase 5 with overlay HTML parity only.

**Status: CLOSED by Phase 8 (tag v1-phase-8).** ArcLayer supplier/client network is rendered on the globe when the company overlay is open. Coverage caveats are tracked in `PHASE_8_DEBT` (a), (c), (d). Entity “highlight” on the globe beyond arcs was not in Phase 8 scope; dots remain the Phase 7 scatter set.

---

## (g) Sass @import deprecation warning — inherited from canonical

**Warning emitted at build:**
```
Deprecation Warning [import]: Sass @import rules are deprecated and will be removed
in Dart Sass 3.0.0.
    src\app\styles\global.scss 1285:9  root stylesheet
```

**Source:** `global.scss:1285 @import './overlay-legacy';` — v3 canonical uses the deprecated `@import` syntax throughout.

**Action:** Wait for v3 upstream to migrate `@import` → `@use`/`@forward` (Dart Sass 3.0 migrator: `https://sass-lang.com/d/import`). Rule 6 forbids editing canonical in V1.

**Blast radius if not migrated:** Build continues to work on Dart Sass 2.x. When Dart Sass upgrades to 3.0 (and v3 hasn't migrated yet), build will break. V1 pins its Sass version accordingly or mirrors v3's migration.
