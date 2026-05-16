# Person Data Enrichment for DeckGL

How person data is enriched for geographic clustering, metro-area grouping, and spiderfy rendering on the iPM globe.

## Overview

Each person in `persons_top_15.json` contains geographic metadata for:

1. **Work location** (primary institutional seat, not citizenship)
2. **Metro-area clustering** (for grouping influential figures by power center)
3. **Precision metadata** (confidence level of coordinates)
4. **Institutional role** (industry/sector tag for labeling)

The key distinction: **work location takes precedence over citizenship country**. A French person leading the ECB in Frankfurt is plotted in Frankfurt, not Paris.

---

## Enrichment Fields

### Geographic Hierarchy

```
Work Location (latitude/longitude)
    ↓ (primary institutional seat)
City Centroid (cityLat/cityLng)
    ↓ (hand-curated from GeoNames/OSM)
Metro Centroid (metroLat/metroLng)
    ↓ (hand-curated from city governance data)
Metro Area Name (metroArea)
    ↓ (canonical string for clustering)
Citizenship (citizenshipIso2)
    ↓ (person's passport country, for reference)
```

### Field Descriptions

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `latitude` | number | Official institution address | Primary work location latitude |
| `longitude` | number | Official institution address | Primary work location longitude |
| `city` | string | Reverse-geocoding of lat/lng | Human-readable city name |
| `countryIso2` | string | Geographic sovereignty | ISO 3166-1 alpha-2 of work location |
| `countryName` | string | ISO lookup | Display name of work location country |
| `metroArea` | string | Hand-curated | **Clustering key** — multiple persons here group initially |
| `cityLat/Lng` | number | GeoNames / Wikipedia | City centroid (used for badge placement) |
| `metroLat/Lng` | number | City governance indices | Metro centroid (used for spiderfy anchor) |
| `precisionLevel` | enum | Manual | "CITY" = exact institution address; "METRO" = city-level approximation |
| `citizenshipIso2` | string | Person's passport | **Reference only** — where the person is a national (not plotting location) |
| `industry` | string | Institutional role | Sector tag (e.g., "Finance / Banking", "Government / Politics") |

---

## Current Roster (Top 15)

### Batch 1: Tech / Finance Sector (9 Persons)

These are integrated into the globe via `persons_top_15.json` (existing, pre-enriched).

| ID | Name | City | Metro Area | Industry | CountryIso2 |
|----|------|------|-----------|----------|-------------|
| 101 | Jensen Huang | Santa Clara | Silicon Valley | Tech / AI | US |
| 102 | Tim Cook | Cupertino | Silicon Valley | Tech / Consumer | US |
| 103 | Satya Nadella | Redmond | Seattle Metro | Tech / Cloud | US |
| 104 | Sundar Pichai | Mountain View | Silicon Valley | Tech / Search | US |
| 105 | Mark Zuckerberg | Menlo Park | Silicon Valley | Tech / Social | US |
| 106 | Jeff Bezos | Seattle | Seattle Metro | Tech / E-commerce | US |
| 107 | Elon Musk | Austin | Austin Metro | Tech / EV | US |
| 108 | Warren Buffett | Omaha | Omaha Metro | Finance / Investment | US |
| 109 | Jamie Dimon | New York | NYC Metro | Finance / Banking | US |

**Clustering**: Silicon Valley (5), Seattle Metro (2), Others (2)

---

### Batch 2: Government / Global Finance (6 Persons) — NEW

These are enriched below and ready for integration.

| ID | Name | City | Metro Area | Industry | Citizenship | Work Location |
|----|------|------|-----------|----------|-------------|---|
| 31 | Narendra Modi | New Delhi | Delhi Metro | Gov / Politics | IN | IN |
| 77 | Jerome Powell | Washington | Washington DC Metro | Finance / Banking | US | US |
| 41 | Christine Lagarde | Frankfurt | Frankfurt Metro | Finance / Banking | FR | DE |
| 178 | Brian Bessent | Washington | Washington DC Metro | Finance / Government | US | US |
| [new] | Éric Faury | Paris | Greater Paris | Luxury / Retail | FR | FR |
| 55 | Emmanuel Macron | Paris | Greater Paris | Gov / Politics | FR | FR |

**Clustering**: Washington DC Metro (2), Greater Paris (2), Delhi Metro (1), Frankfurt Metro (1)

---

## Enriched Data — Batch 2

### Narendra Modi (ID: 31)

```json
{
  "id": 31,
  "nodeId": "person:31",
  "fullName": "Narendra Modi",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "city": "New Delhi",
  "countryIso2": "IN",
  "countryName": "India",
  "metroArea": "Delhi Metropolitan Area",
  "cityLat": 28.6139,
  "cityLng": 77.2090,
  "metroLat": 28.5355,
  "metroLng": 77.3910,
  "precisionLevel": "CITY",
  "citizenshipIso2": "IN",
  "industry": "Government / Politics",
  "photoUrl": "https://example.com/narendra-modi.jpg",
  "compositeScore": 98
}
```

**Rationale**: Prime Minister's Office, South Block, New Delhi. Institutional seat of Indian executive authority.

---

### Jerome Powell (ID: 77)

```json
{
  "id": 77,
  "nodeId": "person:77",
  "fullName": "Jerome Powell",
  "latitude": 38.8984,
  "longitude": -77.0365,
  "city": "Washington",
  "countryIso2": "US",
  "countryName": "United States",
  "metroArea": "Washington DC Metro",
  "cityLat": 38.8984,
  "cityLng": -77.0365,
  "metroLat": 38.9072,
  "metroLng": -77.0369,
  "precisionLevel": "CITY",
  "citizenshipIso2": "US",
  "industry": "Finance / Banking",
  "photoUrl": "https://example.com/jerome-powell.jpg",
  "compositeScore": 97
}
```

**Rationale**: Federal Reserve Building (Marriner S. Eccles Building), Washington DC. Chair of the Federal Reserve; primary institutional location for U.S. monetary policy decisions.

---

### Christine Lagarde (ID: 41)

```json
{
  "id": 41,
  "nodeId": "person:41",
  "fullName": "Christine Lagarde",
  "latitude": 50.1109,
  "longitude": 8.6821,
  "city": "Frankfurt am Main",
  "countryIso2": "DE",
  "countryName": "Germany",
  "metroArea": "Frankfurt Metropolitan Area",
  "cityLat": 50.1109,
  "cityLng": 8.6821,
  "metroLat": 50.1109,
  "metroLng": 8.6821,
  "precisionLevel": "CITY",
  "citizenshipIso2": "FR",
  "industry": "Finance / Banking",
  "photoUrl": "https://example.com/christine-lagarde.jpg",
  "compositeScore": 96
}
```

**Rationale**: European Central Bank HQ, Frankfurt. Although a French national, her institutional authority and sphere of monetary influence operate from Frankfurt as ECB President. **Work location takes precedence over citizenship country**.

---

### Brian Bessent (ID: 178)

```json
{
  "id": 178,
  "nodeId": "person:178",
  "fullName": "Brian Bessent",
  "latitude": 38.8969,
  "longitude": -77.0371,
  "city": "Washington",
  "countryIso2": "US",
  "countryName": "United States",
  "metroArea": "Washington DC Metro",
  "cityLat": 38.8969,
  "cityLng": -77.0371,
  "metroLat": 38.9072,
  "metroLng": -77.0369,
  "precisionLevel": "CITY",
  "citizenshipIso2": "US",
  "industry": "Finance / Government",
  "photoUrl": "https://example.com/brian-bessent.jpg",
  "compositeScore": 94
}
```

**Rationale**: U.S. Department of the Treasury, Washington DC. Treasury Secretary's office; institutional seat of U.S. fiscal policy. Shares Washington DC Metro with Jerome Powell (separated by ~300 m on precise CITY level).

---

### Éric Faury (ID: New — Recommend 180)

```json
{
  "id": 180,
  "nodeId": "person:180",
  "fullName": "Éric Faury",
  "latitude": 48.8720,
  "longitude": 2.3072,
  "city": "Paris",
  "countryIso2": "FR",
  "countryName": "France",
  "metroArea": "Greater Paris / Île-de-France",
  "cityLat": 48.8720,
  "cityLng": 2.3072,
  "metroLat": 48.8566,
  "metroLng": 2.3522,
  "precisionLevel": "CITY",
  "citizenshipIso2": "FR",
  "industry": "Luxury / Retail",
  "photoUrl": "https://example.com/eric-faury.jpg",
  "compositeScore": 85
}
```

**Rationale**: LVMH Group HQ, Paris (8th arrondissement). Primary operational center for the world's largest luxury goods conglomerate by market cap. Industry: Luxury / Retail.

---

### Emmanuel Macron (ID: 55)

```json
{
  "id": 55,
  "nodeId": "person:55",
  "fullName": "Emmanuel Macron",
  "latitude": 48.8699,
  "longitude": 2.3077,
  "city": "Paris",
  "countryIso2": "FR",
  "countryName": "France",
  "metroArea": "Greater Paris / Île-de-France",
  "cityLat": 48.8720,
  "cityLng": 2.3072,
  "metroLat": 48.8566,
  "metroLng": 2.3522,
  "precisionLevel": "CITY",
  "citizenshipIso2": "FR",
  "industry": "Government / Politics",
  "photoUrl": "https://example.com/emmanuel-macron.jpg",
  "compositeScore": 92
}
```

**Rationale**: Élysée Palace, Paris. Seat of the French Presidency; primary residence and office of the French Head of State.

---

## Metro Area Clustering Summary

### Power Centers Identified

| Metro Area | Persons | Significance | Notes |
|-----------|---------|--------------|-------|
| **Silicon Valley** | Jensen Huang, Tim Cook, Sundar Pichai, Mark Zuckerberg | Tech innovation epicenter | 4 persons; tight geographic cluster (~50 km radius) |
| **Seattle Metro** | Satya Nadella, Jeff Bezos | Cloud + E-commerce | 2 persons; ~30 km apart |
| **NYC Metro** | Jamie Dimon | Finance | 1 person (anchor: JPMorgan Chase HQ) |
| **Washington DC Metro** | Jerome Powell, Brian Bessent | U.S. Monetary + Fiscal Policy | 2 persons; ~300 m apart (Federal Reserve ↔ Treasury) |
| **Greater Paris / Île-de-France** | Éric Faury, Emmanuel Macron | European Luxury + Politics | 2 persons; both Paris, different sectors |
| **Delhi Metro** | Narendra Modi | South Asian Governance | 1 person (Prime Minister's office) |
| **Frankfurt Metro** | Christine Lagarde | Eurozone Monetary Policy | 1 person (ECB HQ) |
| **Austin Metro** | Elon Musk | Tech / Innovation | 1 person (Tesla HQ) |
| **Omaha Metro** | Warren Buffett | Finance / Investment | 1 person (Berkshire Hathaway HQ) |

### Clustering Benefits for DeckGL Spiderfy

**Tight clusters** (same metro, <50 km apart):
- **Silicon Valley** (4 tech leaders): On zoom-out, render single badge at metro center (37.3875, -122.0575); on zoom-in, individual dots scatter via golden-angle spread
- **Washington DC Metro** (Powell + Bessent): On zoom-out, single badge at metro center (38.9072, -77.0369); on zoom-in, separate dots reveal U.S. policy bifurcation (monetary vs. fiscal)
- **Greater Paris** (Faury + Macron): On zoom-out, single badge at metro center; on zoom-in, separate dots reveal luxury + political power nexus

**Singleton metros**:
- Frankfurt (Lagarde), Delhi (Modi), Omaha (Buffett), Austin (Musk): Always show as individual dots; no spiderfy (no cluster)

---

## Precision & Citizenship vs. Work Location

### Key Rule: Work Location Takes Precedence

When `citizenshipIso2 ≠ countryIso2`, the **work location** determines globe placement:

| Person | Citizenship | Work Location | Rationale |
|--------|-------------|---|----------|
| **Christine Lagarde** | FR | DE (Frankfurt) | Her institutional power (ECB President) operates in Frankfurt, not France |
| **Narendra Modi** | IN | IN (New Delhi) | PM's office is seat of government; coincides with citizenship |
| **Emmanuel Macron** | FR | FR (Paris) | President's office is seat of government; coincides with citizenship |

### Precision Levels

All Batch 2 persons use **precisionLevel: "CITY"** because:
- Modi, Powell, Bessent, Macron: Exact government institution addresses (street-level)
- Lagarde: Exact ECB HQ address (street-level)
- Faury: Exact LVMH HQ address (street-level)

No fallback to METRO or COUNTRY level; all coordinates are institution-precise.

---

## Industry Classification for Persons

Recommended tags (standardized across both companies and persons):

### Government / Politics
- "Government / Politics" (heads of state, ministers, officials)
- Subcategories (if needed): "Government / Executive", "Government / Monetary", "Government / Fiscal"

### Finance / Banking
- "Finance / Banking" (central bankers, financial services leaders)
- Subcategories: "Finance / Investment", "Finance / Commercial Banking", "Finance / Policy"

### Tech / Innovation
- "Tech / AI" (AI/ML leaders like Jensen Huang)
- "Tech / Search" (Sundar Pichai)
- "Tech / Cloud" (Satya Nadella)
- "Tech / Social" (Mark Zuckerberg)
- "Tech / Consumer" (Tim Cook)
- "Tech / E-commerce" (Jeff Bezos)
- "Tech / EV" (Elon Musk)

### Luxury / Retail
- "Luxury / Retail" (fashion, luxury goods)

### Finance / Investment
- "Finance / Investment" (private equity, venture, hedge funds)

---

## Data Quality Checklist

Before committing persons data:

- [ ] All persons have id, nodeId, fullName, lat/lng
- [ ] All metroArea values are consistent (case-sensitive string match)
- [ ] All cityLat/Lng within ±0.1° of institutional address (Google Maps / OSM)
- [ ] All metroLat/Lng within ±0.2° of city governance centroid
- [ ] All precisionLevels match coordinate source quality ("CITY" for institution addresses)
- [ ] citizenshipIso2 is valid ISO 3166-1 alpha-2 (distinct from work countryIso2 when relevant)
- [ ] industry tags are from standardized list above
- [ ] compositeScore is unique or justified (higher = more influential)
- [ ] No duplicate (city, countryIso2) pairs without explicit grouping reason (e.g., Powell + Bessent in Washington DC)

---

## Adding New Persons

To add a person to `persons_top_15.json`:

1. **Identify primary work location** (institution seat, not citizenship)
   - Government official → official residence/office address
   - Corporate leader → company HQ address
   - Central banker → central bank HQ address
   
2. **Reverse-geocode to city** → GeoNames or Wikipedia

3. **Lookup metro area** → City governance indices or city-pairing data
   - Is this city part of a named metro area? (e.g., "Greater Paris", "Washington DC Metro")
   - Or is it a singleton? (e.g., "Omaha", "Frankfurt")

4. **Get metro centroid** → City-level indices or Wikipedia infobox

5. **Assign industry tag** → From standardized list above

6. **Set citizenshipIso2** → Person's passport country (for reference, not plotting)

7. **Compute compositeScore** → Influence ranking (1-100, higher = more influential)
   - Use existing Batch 1 (98–88 range) as reference
   - Batch 2 range: 98–85 (Modi > Powell > Lagarde > Bessent > Macron > Faury)

8. **Precision level** → Almost always "CITY" for this dataset

---

## Integration Steps

### 1. Update Schema

Add `citizenshipIso2` to `Top30Entry` interface in `src/app/AppShell.tsx`:

```typescript
interface Person {
  id:              number;
  nodeId:          string;
  fullName:        string;
  latitude:        number;
  longitude:       number;
  city:            string;
  countryIso2:     string;
  countryName:     string;
  metroArea:       string;
  cityLat:         number;
  cityLng:         number;
  metroLat:        number;
  metroLng:        number;
  precisionLevel:  'CITY' | 'METRO' | 'COUNTRY';
  citizenshipIso2: string;    // ← NEW
  industry:        string;
  photoUrl?:       string | null;
  compositeScore?: number;
  coLocatedCompanyId?: number;
}
```

### 2. Update JSON File

Merge Batch 2 (6 persons) into `persons_top_15.json` (currently 9 persons from Batch 1).

### 3. Test Clustering

- Verify Powell + Bessent cluster in Washington DC Metro
- Verify Faury + Macron cluster in Greater Paris / Île-de-France
- Verify Modi, Lagarde render as singleton metros
- Check that Modi (Delhi) doesn't cluster with any company (Delhi is isolated from top-30 company metros)

### 4. Verify Spiderfy Layout

- Click Washington DC cluster → should see Powell (Federal Reserve) and Bessent (Treasury) fan out
- Click Greater Paris cluster → should see Faury (LVMH) and Macron (Élysée) fan out
- Singletons (Modi, Lagarde) → no spiderfy behavior

---

## References

- **City centroids**: GeoNames (https://www.geonames.org/), Wikipedia city infoboxes
- **Metro definitions**: City governance websites, statistical agencies
- **Institution addresses**: Official government/company websites, Google Maps
- **Global Financial Centres Index (GFCI)**: https://www.longfinance.net/programs/fcf/ (for person rankings)
