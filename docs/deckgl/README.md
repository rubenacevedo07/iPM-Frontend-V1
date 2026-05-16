# DeckGL Globe Documentation

Complete reference for entity data requirements, schema, clustering algorithms, and rendering pipeline for the iPM globe visualization.

## Contents

### 1. **[entities-schema.md](./entities-schema.md)**
TypeScript contracts for `Company` and `Person` entities.

- Full interface definitions
- Field descriptions and purposes
- Validation rules
- Example JSON records

**Read this first** if you need to understand the data structure.

---

### 2. **[companies-enrichment.md](./companies-enrichment.md)**
How company data is enriched for clustering and geographic visualization.

- Enrichment field descriptions
- Data sources (GeoNames, GFCI, Wikipedia)
- Current clustering strategy (Silicon Valley, Seattle Metro, NYC Metro, etc.)
- Precision levels (CITY, METRO, COUNTRY)
- Industry classification standards
- Data quality checklist
- How to add new companies

**Read this** if you're updating `top30.json`, adding companies, or understanding the geographic metadata.

---

### 2b. **[persons-enrichment.md](./persons-enrichment.md)**
How person data is enriched for geographic clustering, metro-area grouping, and spiderfy rendering.

- Enrichment field descriptions (new: `citizenshipIso2`)
- Work location vs. citizenship country (key distinction)
- Current roster (Batch 1: 9 tech/finance persons; Batch 2: 6 gov/finance persons)
- Clustering strategy (Silicon Valley, Washington DC Metro, Greater Paris, etc.)
- Precision levels and field validation
- Industry classification for persons
- Data quality checklist
- How to add new persons

**Read this** if you're updating `persons_top_15.json`, adding influential figures, or understanding the person-metro clustering.

---

### 3. **[clustering-algorithm.md](./clustering-algorithm.md)**
Metro-aware clustering, spiderfy layout, and person placement algorithms.

- Grouping rules (same metro → always cluster)
- Dynamic distance thresholds by zoom level
- Badge placement and content
- Spiderfy layout algorithm
- Golden-angle person placement
- Colocated company detection
- Rendering pipeline
- Budget constraints (60 fps target)
- Configuration and troubleshooting

**Read this** if you're modifying cluster behavior, optimizing rendering, or debugging layout issues.

---

### 4. **[data-flow.md](./data-flow.md)**
How entity data flows from JSON files through AppShell to the DeckGL engine.

- Load pipeline (JSON → state → engine)
- AppShell data transforms (4-step process)
- Engine processing (GlobeBridge)
- Fallbacks and error handling
- Data dependencies
- Type transforms
- Performance notes
- Debugging techniques

**Read this** if you're tracing data through the app, debugging fetch failures, or understanding the render flow.

---

## Quick Reference

### File Locations

| File | Type | Purpose |
|------|------|---------|
| `/data/top30.json` | Static asset | 30 companies by marketCap (enriched) |
| `/data/persons_top_15.json` | Static asset | 15 persons by compositeScore |
| `src/app/AppShell.tsx` | Component | Loads data, layouts entities, sends to engine |
| `src/engine/GlobeBridge.ts` | Engine bridge | Creates IconLayer, badges, spiderfy lines |
| `src/utils/geoDistance.ts` | Utilities | Haversine distance, person placement |

### Data Transforms

```
JSON files
    ↓ (fetch)
top30Data, persons (raw state)
    ↓ (useMemo: mark gold, compute spread)
top30, top15persons (enriched state)
    ↓ (useEffect: combine)
CMD.SET_ENTITIES → GlobeBridge
    ↓ (clustering, layout)
DeckGL layers (IconLayer, TextLayer, LineLayer)
    ↓
Globe canvas
```

### Current Dataset

**Companies:**
- **30 companies** across 7 metros + 13 singletons
- **Precision**: All at CITY level (exact HQ coordinates)
- **Industries**: 10+ sectors (Semiconductors, Software, Banking, Pharma, Oil & Gas, etc.)

**Persons:**
- **15 persons** (persons_top_15.json)
  - **Batch 1** (9): Tech/Finance sector (Silicon Valley 4, Seattle 2, NYC 1, Omaha 1, Austin 1)
  - **Batch 2** (6): Government/Global Finance (Washington DC 2, Greater Paris 2, Delhi 1, Frankfurt 1)
- **Precision**: All at CITY level (exact work location/institution addresses)
- **Key distinction**: Work location takes precedence (e.g., Lagarde plotted in Frankfurt, not France)

### Key Algorithms

1. **Metro-Aware Clustering** — Two companies in same `metroArea` always group; different metros only if distance < threshold AND same industry
2. **Golden-Angle Spread** — Persons placed at 137.5° intervals from country center to avoid stacking
3. **Spiderfy** — Cluster expands in spiral when clicked; rays connect to individual companies
4. **Colocated Detection** — Pre-computed: persons within 50 km and same company name get `coLocatedCompanyId`

---

## Common Tasks

### Add a new company to top30.json

1. Get exact HQ coordinates (Google Maps, company website)
2. Look up city centroid (GeoNames.org, Wikipedia)
3. Assign to metro area (or create new one)
4. Look up metro centroid (GFCI index)
5. Pick industry from standardized list
6. Assign global city rank (GFCI)
7. Add JSON entry with all enrichment fields
8. Test clustering by zooming in/out

See: **[companies-enrichment.md](./companies-enrichment.md#adding-new-companies)**

---

### Add a new person to persons_top_15.json

1. Identify primary **work location** (institution seat, not citizenship)
   - Government official → official residence/office address (e.g., PM's office, Treasury)
   - Corporate leader → company HQ address
   - Central banker → central bank HQ address
2. Reverse-geocode to city (Google Maps, GeoNames)
3. Assign to metro area (or create new one; check if ties to company metros)
4. Look up metro centroid
5. Pick industry from standardized list (Government / Politics, Finance / Banking, Tech / AI, etc.)
6. Set `citizenshipIso2` (passport country) — different from `countryIso2` if applicable
7. Compute `compositeScore` (1-100, higher = more influential)
8. Add JSON entry with all enrichment fields
9. Test clustering by zooming in/out; verify proper spiderfy behavior

See: **[persons-enrichment.md](./persons-enrichment.md#adding-new-persons)**

---

### Debug clustering issues

1. Check that both companies have the same `metroArea` string (case-sensitive!)
2. Verify both are within 50 km of metro centroid
3. Check `dynamicThreshold` at current zoom level
4. Log clusters in GlobeBridge to see what was computed
5. Compare with expected layout from companies-enrichment.md

See: **[clustering-algorithm.md](./clustering-algorithm.md#troubleshooting)**

---

### Optimize rendering performance

1. Profile with DevTools to see which layer is slow
2. Reduce entity count (fewer companies or persons)
3. Increase clustering distance to reduce badge count
4. Use LOD: hide spiderfy lines at zoom < 10
5. Monitor GPU memory and drawcall count

Target: 60 fps sustained during globe rotation.

See: **[clustering-algorithm.md](./clustering-algorithm.md#budget-constraints)**

---

### Understand person placement

1. **Work location** (not citizenship) determines globe position
   - Person's institution seat (office/residence) takes precedence
   - Example: Lagarde is French (citizenshipIso2: FR) but plotted in Frankfurt (countryIso2: DE) as ECB President
2. Each person gets a golden-angle offset from their work location
3. Spread is limited to `personSpreadRadius` (default 3°)
4. If too close to company HQ (≤ 50 km), pushed further away
5. Result: scattered around work location, no stacking, no HQ collisions

See: **[clustering-algorithm.md](./clustering-algorithm.md#person-placement-algorithm)** and **[persons-enrichment.md](./persons-enrichment.md#precision--citizenship-vs-work-location)**

---

## Validation Checklist

Before committing data changes:

- [ ] All companies have 10 required fields (id, nodeId, type, slug, name, lat, lng, marketCapUsd, isChokepoint, + 4 enrichment fields)
- [ ] All metroAreas are unique and consistent
- [ ] All cityLat/Lng within ±0.1° of GeoNames
- [ ] All metroLat/Lng within ±0.2° of GFCI / city indices
- [ ] All precisionLevels match coordinate source quality
- [ ] industry tags are from standardized list
- [ ] cityRank is unique per city (or justified co-rank)
- [ ] No duplicate (city, country) pairs without explicit grouping reason
- [ ] All countryIso2 are valid ISO 3166-1 alpha-2 codes (UPPERCASE)

See: **[companies-enrichment.md](./companies-enrichment.md#data-quality-checklist)**

---

## References

- **GFCI** (Global Financial Centres Index): https://www.longfinance.net/programs/fcf/
- **GeoNames**: https://www.geonames.org/
- **Wikipedia**: City infobox coordinates (standard for metro centroids)
- **OpenStreetMap**: https://www.openstreetmap.org/
- **DeckGL Docs**: https://deck.gl/

---

## Related Skills

- **[deck-gl-globe-rotation](../skills/deck-gl-globe-rotation.md)** — Auto-rotation, viewState transitions, wheel zoom
- **[deck-gl-icon-layer](../skills/deck-gl-icon-layer.md)** — Icon atlas, 64x64 WebP format, texture strategy

---

## Recent Updates (Batch 2: Global Finance & Government)

**6 influential figures enriched and ready for integration:**

| Name | ID | City | Metro | Work Sector | Notes |
|------|----|----|-------|----------|-------|
| Narendra Modi | 31 | New Delhi | Delhi Metro | Government | Indian PM; South Block |
| Jerome Powell | 77 | Washington | Washington DC Metro | Finance | Federal Reserve Chair |
| Christine Lagarde | 41 | Frankfurt | Frankfurt Metro | Finance | ECB President (French citizen, Frankfurt-based) |
| Brian Bessent | 178 | Washington | Washington DC Metro | Finance | US Treasury Secretary |
| Éric Faury | 180 | Paris | Greater Paris | Luxury | LVMH CEO |
| Emmanuel Macron | 55 | Paris | Greater Paris | Government | French President |

**Integration status:**
- ✅ Enriched data ready in `persons-enrichment.md` (Batch 2 section)
- ✅ Schema updated with `citizenshipIso2` field
- ⏳ Pending: Merge into `persons_top_15.json`
- ⏳ Pending: Update AppShell.tsx Person interface with new fields

See: **[persons-enrichment.md](./persons-enrichment.md#enriched-data--batch-2)** for complete JSON entries and **[persons-enrichment.md](./persons-enrichment.md#integration-steps)** for integration instructions.

---

## Questions?

- Check the relevant doc above
- Look at examples in `top30.json` and `persons_top_15.json`
- Review Batch 2 person entries in `persons-enrichment.md`
- Trace data flow in `src/app/AppShell.tsx` → `src/engine/GlobeBridge.ts`
- Enable logging in GlobeBridge and inspect DevTools console
