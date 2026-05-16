# Company Data Enrichment for DeckGL

How company data is enriched for clustering and geographic visualization on the iPM globe.

## Overview

Each company in `top30.json` contains metadata for three layers of geographic reasoning:

1. **HQ-level precision** — exact street address (precisionLevel: "CITY")
2. **City-level anchoring** — for cluster badge placement
3. **Metro-level clustering** — for spiderfy grouping and co-location detection

---

## Enrichment Fields

### Geographic Hierarchy

```
HQ Location (latitude/longitude)
    ↓ (preserved from source)
City Centroid (cityLat/cityLng)
    ↓ (hand-curated from Wikipedia/GeoNames)
Metro Centroid (metroLat/metroLng)
    ↓ (hand-curated from GFCI / global city indices)
Metro Area Name (metroArea)
    ↓ (canonical string for clustering)
```

### Field Descriptions

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `city` | string | HQ address reverse-geocoding | Human-readable city name (no accents: "Sao Paulo", not "São Paulo") |
| `countryIso2` | string | HQ country lookup | API standard (ISO 3166-1 alpha-2) |
| `countryName` | string | ISO lookup table | Display name in English |
| `metroArea` | string | Hand-curated | **Clustering key** — two companies here group together |
| `cityLat/Lng` | number | GeoNames / Wikipedia | City centroid (used for badge position when all cities of metro are clustered) |
| `metroLat/Lng` | number | GFCI / city indices | Metro centroid (used for spiderfy anchor) |
| `precisionLevel` | enum | Manual | "CITY" = exact HQ; "METRO" = city-level approximation; "COUNTRY" = national only |
| `industry` | string | Manual classification | Sector tag (1-2 words: "Semiconductors", "Software", "Banking", etc.) |
| `cityRank` | number (optional) | GFCI Global Financial Centres Index | Global economic importance (1 = most significant). Used to break ties when a cluster spans two cities. |

---

## Clustering Strategy

### Metro Area Groups (Current Dataset)

```
Silicon Valley (7 companies)
├─ NVIDIA (Santa Clara, rank 25)
├─ Apple (Cupertino, rank 26)
├─ Alphabet (Mountain View, rank 24)
├─ Meta Platforms (Menlo Park, rank 27)
├─ Broadcom (San Jose, rank 23)
├─ Netflix (Los Gatos, rank 28)
└─ Centroid: 37.3875, -122.0575

Seattle Metro (3 companies)
├─ Microsoft (Redmond, rank 40)
├─ Amazon (Seattle, rank 39)
├─ Costco (Issaquah, rank 41)
└─ Centroid: 47.6062, -122.3321

NYC Metro (4 companies)
├─ JPMorgan Chase (New York, rank 2)
├─ Johnson & Johnson (New Brunswick, rank 3)
├─ Mastercard (Purchase, rank 4)
├─ Visa (San Francisco, rank 8)  [note: Bay Area, included for fintech density]
└─ Centroid: 40.7128, -74.0060

Seoul Metro (2 companies)
├─ Samsung Electronics (Suwon, rank 15)
├─ SK Hynix (Icheon, rank 16)
└─ Centroid: 37.5665, 126.9780

Singleton Cities (13 companies)
├─ Houston (ExxonMobil, Chevron)
├─ Austin (Tesla, Oracle)
├─ Shenzhen (Tencent)
├─ Beijing (ICBC)
└─ ... (others)
```

### Clustering Rules

1. **Same metroArea** → Always grouped, even if distance > dynamic threshold
2. **Different metros** → Grouped only if distance < dynamic threshold AND same industry
3. **Tie-breaking** → Use `cityRank` when cluster spans two cities
4. **Zoom levels**:
   - **Globe view (zoomed out)**: Show metro-level badges
   - **City view (zoomed in)**: Show city-level badges with company dots

---

## Precision Levels

### CITY (All current entries)
- **Meaning**: Exact HQ location known (street address)
- **Coordinate source**: Company official HQ coordinates
- **Confidence**: ±50 meters
- **Use case**: All 30 companies have CITY precision

### METRO (future)
- **Meaning**: City-level accuracy only
- **Coordinate source**: City centroid
- **Confidence**: ±2 km
- **Use case**: Smaller companies, startups without exact address

### COUNTRY (future)
- **Meaning**: Country-level only
- **Coordinate source**: Country centroid
- **Confidence**: ±100 km
- **Use case**: Headquarters location unknown, only country known

---

## Industry Classification

Recommended tags (1-2 words, English):
- **Tech**: Software, Cloud, Search, Consumer Electronics, Semiconductors
- **Finance**: Banking, Insurance, Fintech
- **Energy**: Oil & Gas, Renewable
- **Pharma**: Pharma, Biotech
- **Retail**: Retail, E-commerce
- **Other**: Automotive, EV, Defense, Logistics, Telecom, Manufacturing

---

## Data Quality Checklist

- [ ] All 30 companies have valid metroArea (no nulls)
- [ ] All metroAreas appear in CLUSTERING STRATEGY section
- [ ] All cityLat/Lng within ±0.1° of GeoNames canonical
- [ ] All metroLat/Lng within ±0.2° of GFCI / city-level indices
- [ ] No duplicate (city, country) pairs without explicit grouping reason
- [ ] All precisionLevels match coordinate source quality
- [ ] industry tags are consistent (no typos, standardized capitalization)
- [ ] cityRank is unique or justified (co-rank OK for tie-breaking)

---

## Adding New Companies

To add a company to `top30.json`:

1. **Lookup exact HQ address** → reverse-geocode to get lat/lng (4 decimals)
2. **City centroid** → GeoNames or Wikipedia city coordinates
3. **Metro area** → Check GFCI / city indices; map to existing or new metroArea name
4. **Metro centroid** → Canonical center of metro (from GFCI index)
5. **Industry** → Pick from standardized list above
6. **City rank** → Assign globally unique or justified co-rank from GFCI
7. **Precision level** → Almost always "CITY" for this dataset

---

## References

- **GFCI** (Global Financial Centres Index): https://www.longfinance.net/programs/fcf/
- **GeoNames**: https://www.geonames.org/
- **Wikipedia**: City infobox coordinates (standard source for metro centroids)
- **OpenStreetMap**: https://www.openstreetmap.org/ (alternative validation)
