# Phase 7 — Technical Debt Log

**Branch:** `phase7-globe-entities`
**Tag:** `v1-phase-7`
**Scope closed (IN):** 30 company entity dots on globe + hover + click handlers, V1-authored GlobeBridge extension informed by v3 `useLayers3D.ts` (not a verbatim port).

---

## (a) Persons layer — deferred to Phase 7.1

**Gap:** Phase 7 planned 30 persons + 30 companies. Persons skipped per Decision P.C because V1's person data lacks live lat/lng:
- `usePersons()` → `PersonSummary[]` has `{id, name, lastName}` only
- `useGlobalPowerRanking()` → `GlobalPowerRankingCardDto[]` has no coordinates either
- `usePersonFacilities(id)` has lat/lng but requires 30 parallel fetches
- v3's own `useGlobeData.ts` hardcodes 8 demo persons with lat/lng — NOT production

**Decision rationale (from user):** "Hardcoded lat/lng for real persons = false production data. Phase 7 payoff must withstand live demo scrutiny."

**Unblock condition:** Backend endpoint `/api/persons/with-location?limit=30` (or equivalent) exposing person-primary-location lat/lng. V1 will then add a `usePersonsWithLocation` hook + push to GlobeBridge alongside companies. Color: `[0, 229, 255, 220]` (cyan, already reserved in `_buildLayers` dotColor table).

**Scope:** Phase 7.1.

---

## (b) Chokepoints layer — deferred to Phase 7.1

**Gap:** Phase 7 planned 40 chokepoints/facilities. Skipped per Decision B2.

**Missing in V1:** `CommodityChokepoint` type at `src/types/chokepoint.ts` has no latitude/longitude fields:
```ts
export interface CommodityChokepoint {
  id: number; name: string; region: string; controlledBy: string;
  threatLevel: number; closureRisk: number;
  gdpImpactPercent: number | null; dailyOilFlowMbd: number | null;
  isActive: boolean; notes: string | null;
}
```

**Decision rationale (from user):** "Do NOT attempt to query backend for missing fields in Phase 7. Do NOT use GeoJsonLayer polygons as substitute."

**Unblock condition:**
1. Confirm backend `/api/chokepoints` actually returns lat/lng (DB schema inspection or endpoint curl).
2. Extend V1 type (V1 edit, not canonical).
3. Render as distinct-color Scatterplot dots (sprint skill suggests different icon/color from person/company).

**Scope:** Phase 7.1.

---

## (c) Country risk GeoJsonLayer fills — deferred to Phase 7.2

**Per sprint tracker Phase 7 spec:** "Country risk fills: ONLY countries with RiskScore > 60. Max opacity 0.25. Target: subtle, night-Earth aesthetic, NOT political map."

**Current V1 state:** `globe-countries` layer renders with uniform low-opacity fill `[8, 20, 48, 80]` and thin cyan line. No risk-based coloring.

**v3 reference:** `useLayers3D.ts:14-24` `countryFill()` computes RGBA from `riskByIso[iso_a3]` bucket (red > 70, amber > 40, low-fill > 15).

**Data source:** `useCountries()` + `useCompositeIndices()` hooks — already in V1 (check `src/hooks/` if implementing).

**Scope:** Phase 7.2.

---

## (d) ArcLayer supplier/client visualization — Phase 8

**Gap:** When overlay=company is open, the NETWORK column in the panel shows TOP SUPPLIERS + TOP CLIENTS but the globe does NOT render arcs supplier→company→client.

**Status from Phase 5 debt (f):** "Intentionally deferred. Closing Phase 5 with overlay HTML parity only." — **still open, unblocks in Phase 8.**

**v3 reference:** `useLayers3D.ts:104-122` `globe-arcs` ArcLayer with great-circle + `d.strength` → width mapping + `arcColor(relationType)`.

**Data available:** `useCompanyProviders(id)` (lat/lng via `provider.latitude/longitude` in type `CompanyProvider`), `useCompanyClients(id)` (via companyById lookup).

**Scope:** Phase 8.

**Status: CLOSED by Phase 8 (tag v1-phase-8).** V1 uses static great-circle arcs (amber supplier, cyan client) driven by `companyNetworkMapper` + `NETWORK_RESOLVED`. Flowing / animated arcs are explicitly deferred; see `PHASE_8_DEBT` (b).

---

## (e) TextLayer labels — deferred until hover UX stable

**Per v3:** `useLayers3D.ts:178-195` renders `TextLayer<EntityDot>` with billboard text for selected OR hovered entity.

**Why deferred:** Phase 7 scope decision — "TextLayer labels — deferred until dots work clean". Ship dots + hover + click first, validate fps + picking, then add labels.

**Scope:** post-Phase 7 polish, likely grouped with Phase 7.2.

---

## (f) 20× memory cycle for 30-dot globe

**Protocol:** Same pattern as Phase 5 entry (d) / Phase 6 entry (c). Open `/workstation`, DevTools Memory baseline → 20× open/close `?overlay=company&id=1` (or toggle any dot-triggering navigation) → GC → final. Threshold <5 MB.

**Current status:** **PENDING — heap protocol still manual** (aligns with Phase 6 entry (c) strategy — consolidate measurement across phases).

**Code-side (Phase 9, `master` ≥ unload commit):** `AppShell` sends `ENGINE.DISPOSE` on `pagehide` / `beforeunload` once; `engineManager` disposes from `initializing` / `failed` / `idle` / `active` so the deck and WebGL release on full navigation or tab close. This does **not** replace the 20× DevTools measurement — run the protocol in `docs/PHASE_9.md` to close (f) and GATE C.

**Phase 7-specific leak suspects if delta fails:**
- `_hoveredId` state updates trigger `_redraw()` on every distinct hover — high-frequency. Check if deck.gl `setProps({ layers })` leaks between frames.
- `ScatterplotLayer` instances recreated in every `_buildLayers()` call (called on each `_redraw`). deck.gl expected to diff; verify no accumulating layer objects.
- `ResizeObserver` cleanup in `dispose()` — verified clean in Phase 3a.

---

## Implementation notes (for reference, not debt)

- `GlobeBridge._buildLayers()` composes 5 layers: `globe-base`, `globe-countries`, `globe-arcs` (Phase 8), `globe-rings` (pickable, hover/focus-aware), `globe-dots` (decorative inner). v3’s `TextLayer` labels still deferred per scope.
- `dotColor()` helper inline in `_buildLayers` matches v3 table byte-for-byte except for scope reservation comment on PERSON (unused in Phase 7).
- `_hoveredId` dedup at onHover prevents ENGINE.ENTITY_HOVER flood on repeat hover events for same entity.
- EntityRef passed through `info.object` — V1's flat shape already matches what ENGINE.ENTITY_HOVER expects.
