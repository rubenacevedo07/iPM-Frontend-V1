# DeckGL Clustering Algorithm for Globe

How companies and persons are grouped, spiderfied, and rendered on the globe.

---

## Overview

The clustering system has three modes:

1. **Metro Mode** — Dynamic distance threshold with metro-aware grouping
2. **Spiderfy Mode** — When cluster is clicked, rays fan out from center
3. **Person Placement** — Golden-angle spread within country, avoiding company HQs

---

## Metro-Aware Clustering

### Grouping Rules

```javascript
function shouldCluster(company1, company2, dynamicThreshold) {
  // Rule 1: Same metro area → ALWAYS group (distance irrelevant)
  if (company1.metroArea === company2.metroArea) {
    return true;
  }
  
  // Rule 2: Different metros → group only if distance < threshold AND same industry
  const distanceKm = haversineKm(
    company1.latitude, company1.longitude,
    company2.latitude, company2.longitude
  );
  
  if (distanceKm < dynamicThreshold && 
      company1.industry === company2.industry) {
    return true;
  }
  
  return false;
}
```

### Dynamic Threshold

- **Zoom level < 5** (globe view): 500 km threshold
- **Zoom level 5–10** (regional): 200 km threshold
- **Zoom level 10–15** (city): 50 km threshold
- **Zoom level > 15** (street): No clustering, show all

### Badge Placement (Cluster Center)

When multiple companies are grouped:

```javascript
function computeClusterCenter(companies) {
  // If all companies share the same metroArea
  if (allSameMetro(companies)) {
    // Use metro centroid
    return {
      lat: companies[0].metroLat,
      lng: companies[0].metroLng,
      label: companies[0].metroArea
    };
  }
  
  // If companies span multiple metros, use arithmetic mean
  const mean = {
    lat: average(companies.map(c => c.latitude)),
    lng: average(companies.map(c => c.longitude))
  };
  
  // Optional: snap to nearest city if within 50 km
  const nearestCity = companies.reduce((best, c) => {
    const dist = haversineKm(mean.lat, mean.lng, c.cityLat, c.cityLng);
    return dist < 50 && (!best || dist < best.dist) 
      ? { ...c, dist } 
      : best;
  }, null);
  
  return nearestCity ? 
    { lat: nearestCity.cityLat, lng: nearestCity.cityLng, label: nearestCity.city } :
    { lat: mean.lat, lng: mean.lng, label: `${companies.length} companies` };
}
```

### Badge Content

- **Count**: "3 companies"
- **Region name** (if single metro): "Silicon Valley"
- **Sub-labels** (optional): Industry tag if homogeneous cluster
- **On click**: Spiderfy to show individual dots

---

## Spiderfy Layout

When a cluster is clicked, companies fan out in a spiral around the cluster center.

### Algorithm

```javascript
function spiderfyCluster(cluster, centerLat, centerLng) {
  const companies = cluster.companies;
  const baseDistance = 0.05; // degrees (~5.5 km at equator)
  
  return companies.map((company, index) => {
    // Angle: evenly distribute around circle
    const angle = (index / companies.length) * 2 * Math.PI;
    
    // Distance: spiral outward if many companies
    const spiralFactor = 1 + Math.floor(index / 12) * 0.3;
    const distanceDegreesLat = baseDistance * spiralFactor * Math.cos(angle);
    const distanceDegreesLng = baseDistance * spiralFactor * Math.sin(angle);
    
    // Account for latitude distortion (Mercator projection artifacts)
    const latAdjustment = Math.cos((centerLat * Math.PI) / 180);
    
    return {
      ...company,
      spiderfyLat: centerLat + distanceDegreesLat,
      spiderfyLng: centerLng + (distanceDegreesLng / latAdjustment)
    };
  });
}
```

### Spiderfy Line Rendering

- **From**: Cluster center (badge position)
- **To**: Each company dot
- **Style**: Thin gray lines (opacity 0.5), beneath dots
- **On click elsewhere**: Lines collapse back to cluster center

---

## Person Placement Algorithm

Persons are spread within their country to avoid stacking and company HQ collisions.

### Golden-Angle Spread

```javascript
function placePersonDot(personId, countryLat, countryLng, topCompanies) {
  // Golden angle in radians (≈137.5°)
  const goldenAngle = (3 - Math.sqrt(5)) * Math.PI; // radians
  
  // Spread radius: dynamic based on country size
  const spreadRadiusDegrees = 3; // ~330 km at equator
  
  // Person's angle from country center
  const angle = personId * goldenAngle;
  
  // Person's distance from country center (random, up to spreadRadius)
  const randomRadius = Math.random() * spreadRadiusDegrees;
  
  // Cartesian offset
  const offsetLat = randomRadius * Math.cos(angle);
  const offsetLng = randomRadius * Math.sin(angle);
  
  let personLat = countryLat + offsetLat;
  let personLng = countryLng + offsetLng;
  
  // Check for collision with nearby company HQs (within 50 km)
  const nearbyCompany = topCompanies.find(c => 
    haversineKm(personLat, personLng, c.latitude, c.longitude) < 50 &&
    c.countryIso2 === personCountry
  );
  
  if (nearbyCompany) {
    // Push person further away from company HQ
    const pushAngle = Math.atan2(
      personLat - nearbyCompany.latitude,
      personLng - nearbyCompany.longitude
    );
    const pushDistance = 0.1; // degrees
    
    personLat += pushDistance * Math.cos(pushAngle);
    personLng += pushDistance * Math.sin(pushAngle);
  }
  
  return { lat: personLat, lng: personLng };
}
```

### Colocated Company Detection

Pre-computed in AppShell during render setup:

```javascript
const coLocatedCompanyId = topCompanies.find(company => 
  company.name === person.companyName &&
  haversineKm(
    person.countryLat, person.countryLng,
    company.latitude, company.longitude
  ) <= 50
)?.id;

// Stored in person entity for rendering hints
person.coLocatedCompanyId = coLocatedCompanyId;
```

---

## Rendering Pipeline

### Step 1: Compute Clusters
```javascript
const clusters = computeClusters(companies, dynamicThreshold);
```

### Step 2: Layout Persons
```javascript
const persons = computePersonPositions(personsData, companies);
```

### Step 3: Create Entities (Engine Input)
```javascript
const entities = [
  ...persons.map(p => ({
    ...p,
    type: 'PERSON',
    isGold: true  // top-15 persons always gold
  })),
  ...companies.map(c => ({
    ...c,
    type: 'COMPANY',
    isGold: c.marketCapUsd > goldThreshold  // top-15 by marketCap
  }))
];

engine.send({ type: 'CMD.SET_ENTITIES', data: { entities } });
```

### Step 4: Render on Globe
- **Dots**: IconLayer (DeckGL) at entity lat/lng
- **Clusters**: TextLayer badges at cluster center
- **Spiderfy**: LineLayer (hidden by default)

---

## Budget Constraints

### Globe Layer Budget (Strict)

- **Entity dots**: ~100 total (30 companies + 15 persons + headroom)
- **Cluster badges**: ≤ 15 (one per metro area or regional group)
- **Spiderfy lines**: ≤ 50 (only when cluster is active)
- **Target**: 60 fps sustained during rotation with all layers active

### Performance Tuning

If framerate drops below 50 fps:

1. **Reduce dot count** before optimizing layer rendering
2. **Batch cluster updates** — don't recompute clusters on every zoom
3. **Use LOD** (level-of-detail) — hide spiderfy lines at zoom < 10
4. **Simplify badges** — remove sub-labels at zoom < 8

---

## Configuration

### Current Settings (top30.json + persons_top_15.json)

```javascript
// Globe clustering config
CLUSTERING_CONFIG = {
  globalZoom: 5,
  dynamicThreshold: 500,  // km
  companyCount: 30,
  personCount: 15,
  spiderfyRadius: 0.05,   // degrees
  personSpreadRadius: 3,  // degrees
};
```

### To Adjust:
- `dynamicThreshold`: Tighten for more metro awareness, loosen for geographic clustering
- `spiderfyRadius`: Increase to spread spiderfied dots further apart
- `personSpreadRadius`: Increase to scatter persons more widely within country

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Persons stack on top of company HQs | Person placement collision detection failing | Increase `personSpreadRadius` or improve collision loop |
| Clusters don't form for same-metro companies | `metroArea` mismatch or capitalization | Verify `metroArea` strings are identical in `top30.json` |
| Spiderfy rays off-screen | `spiderfyRadius` too large | Reduce `spiderfyRadius` or use viewport-aware scaling |
| 60 fps drops to 40 fps on rotation | Too many entities at current zoom | Reduce company count or implement LOD |
| Badge text overlaps | Dynamic threshold too aggressive | Tighten threshold or increase badge anchor spacing |
