# Phase 8 — ArcLayer: deferred / follow-up work

**Context:** Phase 8 lands static `ArcLayer` edges (top-10 suppliers + top-10 clients by `contractValue`) on `_GlobeView` when `?overlay=company&id=` is open. `NETWORK_RESOLVED` → `app.machine` → `CMD.SET_ARCS` → `GlobeBridge`. Mapper: `src/services/companyNetworkMapper.ts`.

**Tag when closed / superseded:** `v1-phase-8` (static arcs + machine wiring + Host dispatch).

---

## (a) Orphan / unmatched network endpoints

**Gap:** A provider or client row is only drawn if the target `Company` row exists in the in-memory `companyById` map (from `useCompanies()`) and passes `hasValidCoords` (rejects Null Island `0,0`).

**Effect:** If the focal company’s counterparty is not in the loaded company set, or has unusable coordinates, that edge is skipped silently. With Phase 7’s ~30 company cap, many real edges may not render.

**Next:** **Phase 8.2** — dedicated backend response or enriched company batch so all provider/client rows resolve to lat/lng without relying on the globe’s entity subset.

---

## (b) Flowing / time-varying arc animation

**Gap:** Current `ArcLayer` is **static** (no `TripLayer`, no per-frame dash offset, no shader animation).

**Next:** **Phase 8.1** — optional v3-style motion; keep performance budget in mind (see globe layer budget in `CLAUDE.md`).

---

## (c) Truncation (top-10 + top-10, max 20)

**Gap:** Only the top 10 providers and top 10 clients by `contractValue` are shown. Long tails are invisible.

**Next:** product decision (expand N, or separate “view all” surface), not a rendering bug.

---

## (d) Arcs without matching ScatterplotLayer dots

**Acceptable by design:** An arc may end at coordinates for a company **outside** Phase 7’s top-30 dot set, so the arc is visible but there is no dot at the endpoint. Documented for QA so it is not filed as a regression.

---

## (e) `CompanyOverlayHost` — `NETWORK_RESOLVED` from React

**Gap:** Fetches and `NETWORK_RESOLVED` are emitted from the Host via `useEffect`, not from a future `workspace.machine` (per ADR-0002 / centralised workspace actor).

**Mitigation in Phase 8:** TanStack Query / hook dedup; `app.machine` stale-id guard on `companyId`.

**Next:** Re-home under the workspace/orchestrator actor when ADR-0002 lands.

---

## Cross-references (resolved elsewhere)

- **Phase 5 debt (f):** closed by Phase 8 — see `PHASE_5_DEBT.md`.
- **Phase 7 debt (d):** closed by Phase 8 — see `PHASE_7_DEBT.md`.
