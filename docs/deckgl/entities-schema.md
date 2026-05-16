# Entity Data Schema for DeckGL Globe

Complete TypeScript contracts for entities rendered on the iPM globe visualization.

## Company Entity

```typescript
interface Company {
  // === IDENTITY (preserve verbatim) ===
  id:            number;              // Unique numeric ID
  nodeId:        string;              // Format: "company:{id}"
  type:          'COMPANY';           // Always 'COMPANY'
  slug:          string;              // URL-safe identifier (e.g., "nvidia", "apple")
  name:          string;              // Display name (e.g., "NVIDIA", "Apple Inc.")

  // === FINANCIALS ===
  marketCapUsd:  number;              // Market capitalization in USD

  // === GEOGRAPHIC — HQ LOCATION ===
  latitude:      number;              // HQ exact latitude (4 decimals, preserve)
  longitude:     number;              // HQ exact longitude (4 decimals, preserve)
  city:          string;              // City where HQ is located
  countryIso2:   string;              // ISO 3166-1 alpha-2 (e.g., "US", "TW", "DE")
  countryName:   string;              // Full country name in English

  // === CLUSTERING — Metro Area (KEY FOR SPIDERFY) ===
  metroArea:     string;              // Economic region (e.g., "Silicon Valley", "NYC Metro")
  metroLat:      number;              // Metro centroid latitude (4 decimals)
  metroLng:      number;              // Metro centroid longitude (4 decimals)

  // === CITY ANCHORS — for badge placement ===
  cityLat:       number;              // City centroid latitude (4 decimals)
  cityLng:       number;              // City centroid longitude (4 decimals)
  cityRank?:     number;              // Global economic rank (1=most significant, optional)

  // === PRECISION & CLASSIFICATION ===
  precisionLevel: 'CITY' | 'METRO' | 'COUNTRY';  // Coordinate confidence
  industry:      string;              // Primary sector (e.g., "Semiconductors", "Software")

  // === RENDERING HINTS ===
  isChokepoint?: boolean;             // Critical infrastructure flag (optional, default false)
}
```

**Example:**
```json
{
  "id": 1,
  "nodeId": "company:1",
  "type": "COMPANY",
  "slug": "nvidia",
  "name": "NVIDIA",
  "latitude": 37.368830,
  "longitude": -121.913370,
  "marketCapUsd": 4339000000000,
  "isChokepoint": false,
  "city": "Santa Clara",
  "countryIso2": "US",
  "countryName": "United States",
  "metroArea": "Silicon Valley",
  "cityLat": 37.3540,
  "cityLng": -121.9552,
  "metroLat": 37.3875,
  "metroLng": -122.0575,
  "precisionLevel": "CITY",
  "industry": "Semiconductors",
  "cityRank": 25
}
```

---

## Person Entity

```typescript
interface Person {
  // === IDENTITY ===
  id:            number;              // Unique numeric ID
  nodeId:        string;              // Format: "person:{id}"
  type:          'PERSON';            // Always 'PERSON'
  slug:          string;              // URL-safe identifier
  fullName:      string;              // Display name

  // === RENDERING ===
  photoUrl?:     string | null;       // Portrait image URL (optional)

  // === GEOGRAPHIC — WORK LOCATION (PRIMARY) ===
  latitude:      number;              // Primary work location latitude (institution seat)
  longitude:     number;              // Primary work location longitude (institution seat)
  city:          string;              // City where person primarily works
  countryIso2:   string;              // ISO 3166-1 alpha-2 of work location
  countryName:   string;              // Full country name of work location

  // === CLUSTERING — Metro Area (KEY FOR SPIDERFY) ===
  metroArea:     string;              // Economic region (e.g., "Silicon Valley", "Washington DC Metro")
  metroLat:      number;              // Metro centroid latitude (4 decimals)
  metroLng:      number;              // Metro centroid longitude (4 decimals)

  // === CITY ANCHORS — for badge placement ===
  cityLat:       number;              // City centroid latitude (4 decimals)
  cityLng:       number;              // City centroid longitude (4 decimals)

  // === CITIZENSHIP (REFERENCE) ===
  citizenshipIso2: string;            // Person's passport country (ISO 3166-1 alpha-2)
                                      // NOTE: work location (countryIso2) takes precedence for plotting

  // === PRECISION & CLASSIFICATION ===
  precisionLevel: 'CITY' | 'METRO' | 'COUNTRY';  // Coordinate confidence
  industry:      string;              // Primary sector (e.g., "Finance / Banking", "Government / Politics")

  // === ASSOCIATION ===
  companyName?:  string;              // Name of affiliated company (for colocated-dot detection)
  coLocatedCompanyId?: number;        // Pre-computed company ID if within ≤50 km

  // === RANKING ===
  compositeScore?: number;            // Influence score (1-100, higher = more influential, optional)
}
```

**Example (Jensen Huang — Tech Sector):**
```json
{
  "id": 101,
  "nodeId": "person:101",
  "type": "PERSON",
  "slug": "jensen-huang",
  "fullName": "Jensen Huang",
  "photoUrl": "https://example.com/jensen.jpg",
  "latitude": 37.3688,
  "longitude": -121.9134,
  "city": "Santa Clara",
  "countryIso2": "US",
  "countryName": "United States",
  "metroArea": "Silicon Valley",
  "cityLat": 37.3540,
  "cityLng": -121.9552,
  "metroLat": 37.3875,
  "metroLng": -122.0575,
  "precisionLevel": "CITY",
  "citizenshipIso2": "US",
  "industry": "Tech / AI",
  "companyName": "NVIDIA",
  "coLocatedCompanyId": 1,
  "compositeScore": 98
}
```

**Example (Christine Lagarde — Work Location ≠ Citizenship):**
```json
{
  "id": 41,
  "nodeId": "person:41",
  "fullName": "Christine Lagarde",
  "photoUrl": "https://example.com/christine-lagarde.jpg",
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
  "compositeScore": 96
}
```

**Note on Lagarde**: French citizen (citizenshipIso2: "FR"), but plotted in Frankfurt (countryIso2: "DE") because her institutional authority as ECB President operates there. **Work location takes precedence for globe placement.**

---

## Rendering Requirements

### Company Dots
- **Icon Layer**: 64x64 WebP with alpha channel
- **Color**: Cyan for non-gold, gold for top-15 by marketCap
- **Clustering**: Two companies in same `metroArea` are grouped (see clustering-algorithm.md)

### Person Dots
- **Color**: Gold (top-15 persons)
- **Spread**: Golden-angle distribution (137.5° per id) within country, avoiding company HQ positions
- **Colocated**: Persons within ≤50 km and same company name pre-tag `coLocatedCompanyId`

### Badge/Cluster Labels
- Anchored at `metroLat/metroLng` (metro centroid)
- Shows entity count when multiple companies share `metroArea`
- Breaks ties using `cityRank`

---

## Data Sources

- **Companies**: `/data/top30.json` (30 public companies by marketCap)
- **Persons**: `/data/persons_top_15.json` (15 persons by compositeScore)
- **Fallback**: `companyService.getAll()` (API with static JSON fallback)

---

## Validation Rules

1. **No missing fields**: All required fields MUST be present
2. **Coordinate precision**: 4 decimal places (≈11 meters)
3. **ISO2 codes**: UPPERCASE, valid ISO 3166-1 alpha-2
4. **Metro areas**: Consistent across companies in same cluster
5. **City rank**: 1 = most significant globally; optional but recommended
6. **Industry tags**: 1-2 words, English, consistent across dataset
