# Data Flow: From JSON to Globe Rendering

How entity data flows from static JSON files through AppShell to the DeckGL engine.

---

## Load Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     AppShell.tsx                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
         useEffect: Fetch /data/top30.json
                            ↓
     [top30Data] State ← Parsed Top30Entry[]
                            ↓
         useMemo: Build golden-tagged array
                 (isGold: i < 15 by marketCap)
                            ↓
           [top30] State ← Company[] entities
                            ↓
      usePersonsMap() hook ← Fetch /data/persons_top_15.json
                            ↓
         [persons] State ← Person[] data
                            ↓
    useMemo: Layout persons + detect colocations
                            ↓
        [top15persons] State ← Person[] entities
                            ↓
      useEffect: Combine & send to engine
                            ↓
   CMD.SET_ENTITIES → [...top15persons, ...top30]
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              GlobeBridge (engineRef)                          │
├─────────────────────────────────────────────────────────────┤
│ Creates IconLayer, badges, spiderfy lines                    │
│ Renders to DeckGL canvas                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## AppShell Data Transforms

### Step 1: Load Top30 Companies

**File**: `src/app/AppShell.tsx`, lines 143–151

```typescript
const [top30Data, setTop30Data] = useState<Top30Entry[] | null>(null)
useEffect(() => {
  let cancelled = false
  fetch('/data/top30.json')
    .then(r => r.json() as Promise<Top30Entry[]>)
    .then(arr => { if (!cancelled) setTop30Data(arr) })
    .catch(err => console.error('[AppShell] failed to load /data/top30.json', err))
  return () => { cancelled = true }
}, [])
```

**Output**: 30 entries, raw JSON structure with all enrichment fields.

---

### Step 2: Mark Top-15 as Gold

**File**: `src/app/AppShell.tsx`, lines 190–205

```typescript
const top30 = useMemo(() => {
  if (!top30Data) return null
  return top30Data.slice(0, 30).map((c, i) => ({
    id:           c.id,
    nodeId:       c.nodeId,
    type:         c.type,
    slug:         c.slug,
    name:         c.name,
    latitude:     c.latitude,
    longitude:    c.longitude,
    marketCapUsd: c.marketCapUsd,
    isChokepoint: c.isChokepoint ?? false,
    isGold:       i < 15,                  // ← Top 15 marked gold
    iconUrl:      DECKGL_ICONS[c.name],    // ← Logo lookup
  }))
}, [top30Data])
```

**Output**: Company[] with rendering hints (isGold, iconUrl).

---

### Step 3: Load & Layout Persons

**File**: `src/app/AppShell.tsx`, lines 207–238

```typescript
const { persons } = usePersonsMap()  // ← Fetch persons_top_15.json

const top15persons = useMemo(() => {
  if (!top30) return null
  return persons
    .filter(p => p.countryLat != null && p.countryLng != null)
    .map(p => {
      // Pre-tag colocated company
      const colocated = p.companyName
        ? top30.find(c =>
            c.name === p.companyName &&
            haversineKm(p.countryLat!, p.countryLng!, c.latitude, c.longitude) <= 50
          )
        : undefined
      
      // Golden-angle spread within country
      const pos = placePersonDot(p.id, p.countryLat!, p.countryLng!, top30)
      
      return {
        id:        p.id,
        nodeId:    p.nodeId,
        type:      'PERSON' as const,
        slug:      p.slug,
        name:      p.fullName,
        latitude:  pos.lat,              // ← Spread position
        longitude: pos.lng,
        photoUrl:  p.photoUrl ?? null,
        coLocatedCompanyId: colocated?.id,  // ← Pre-computed
      }
    })
}, [top30, persons])
```

**Output**: Person[] with spread coordinates and colocated HQ hints.

---

### Step 4: Send to Engine

**File**: `src/app/AppShell.tsx`, lines 244–247

```typescript
useEffect(() => {
  if (!top30 || !top15persons) return
  engineRef.send({ type: 'CMD.SET_ENTITIES', data: { entities: [...top15persons, ...top30] } })
}, [top30, top15persons, engineRef])
```

**Order**: Persons FIRST, companies LAST (DeckGL draws in array order).

---

## Engine Processing

### GlobeBridge Receives Entities

**File**: `src/engine/GlobeBridge.ts`

```typescript
case 'CMD.SET_ENTITIES':
  const { entities } = payload.data
  
  // 1. Separate by type
  const companies = entities.filter(e => e.type === 'COMPANY')
  const persons = entities.filter(e => e.type === 'PERSON')
  
  // 2. Compute clusters
  const clusters = clustering.computeClusters(companies, dynamicThreshold)
  
  // 3. Build layer data
  const iconData = [...persons, ...companies]
    .map(e => ({
      position: [e.longitude, e.latitude],
      icon: e.iconUrl || defaultIcon(e.type, e.isGold),
      size: e.isGold ? 48 : 32,
      color: colorByType(e.type, e.isGold)
    }))
  
  const badgeData = clusters.map(cluster => ({
    position: [cluster.centerLng, cluster.centerLat],
    text: `${cluster.companies.length} ${cluster.metroArea || 'companies'}`,
    size: 12
  }))
  
  // 4. Update deck props
  deck.setProps({
    layers: [
      new IconLayer({ data: iconData, ... }),
      new TextLayer({ data: badgeData, ... }),
      new LineLayer({ data: spiderfyLines, ... })
    ]
  })
  break
```

---

## Fallbacks & Error Handling

### Top30 Fetch Failure

If API and static JSON both fail:

```typescript
// In companyService.ts
getAll: async () => {
  try {
    const response = await fetch(`${API_COMPANIES}/Companies`)
    if (!response.ok) throw new Error(...)
    return response.json()
  } catch {
    const res = await fetch('/top30.json')  // ← Fallback to static
    return res.json()
  }
}
```

### Persons Fetch Failure

If persons endpoint fails, globe still renders companies (graceful degradation).

```typescript
const { persons } = usePersonsMap()  // Returns [] on error
```

---

## Data Dependencies

### Render Blocking

- **AppShell renders** → Waits for top30Data AND persons
- **Both null** → Globe renders empty (no dots, no badges)
- **top30Data null, persons loaded** → Persons render, companies hidden
- **top30Data loaded, persons null** → Companies render, persons hidden (graceful)

### Memo Dependencies

```typescript
useMemo(() => {...}, [top30Data])        // ← Recompute on data change
useMemo(() => {...}, [top30, persons])   // ← Recompute on layout inputs
useEffect(() => {...}, [top30, top15persons, engineRef])  // ← Send to engine
```

---

## Type Transforms

### JSON → AppShell

**Input** (top30.json):
```json
{
  "id": 1,
  "nodeId": "company:1",
  "type": "COMPANY",
  "name": "NVIDIA",
  "latitude": 37.3688,
  "longitude": -121.9134,
  "city": "Santa Clara",
  "countryIso2": "US",
  "metroArea": "Silicon Valley",
  ...
}
```

**Output** (top30 state):
```typescript
{
  ...input,
  isGold: true,              // ← Added (i < 15)
  iconUrl: "/deckgl/Nvidia.webp"  // ← Added (lookup)
}
```

### Persons → AppShell

**Input** (persons_top_15.json):
```json
{
  "id": 101,
  "nodeId": "person:101",
  "fullName": "Jensen Huang",
  "countryLat": 37.4419,
  "countryLng": -122.1430,
  "companyName": "NVIDIA"
}
```

**Output** (top15persons state):
```typescript
{
  id: 101,
  nodeId: "person:101",
  type: 'PERSON',
  name: "Jensen Huang",
  latitude: 37.4523,         // ← Spread position
  longitude: -122.1089,
  coLocatedCompanyId: 1      // ← Pre-computed
}
```

---

## Performance Notes

### Memoization Strategy

- **top30**: Recomputed only when `top30Data` changes (≈ once per page load)
- **top15persons**: Recomputed when `top30` or `persons` change (≈ once per page load)
- **Engine send**: Happens only when both memos change (≈ once per page load)

### Memory Footprint

- **30 companies** × ~500 bytes/entity = ~15 KB
- **15 persons** × ~400 bytes/entity = ~6 KB
- **Total**: ~21 KB in state (negligible)

### Network

- **Fetch top30.json**: ~20 KB, ≈ 50 ms on fast connection
- **Fetch persons_top_15.json**: ~15 KB, ≈ 40 ms
- **Parallel**: Both fetches run concurrently, total ≈ 100 ms wall time

---

## Debugging

### Enable Network Logging

```typescript
// In AppShell.tsx, line 149
.catch(err => {
  console.error('[AppShell] failed to load /data/top30.json', err)
  console.log('Retry with fallback URL...')
})
```

### Check Redux DevTools

```typescript
// In app.machine.ts, events section
{
  type: 'CMD.SET_ENTITIES',
  data: {
    entities: [...top15persons, ...top30]
  }
}
```

### Inspect Engine Props

```typescript
// In GlobeBridge.ts
console.log('[GlobeBridge] Entities received:', entities.length)
console.log('[GlobeBridge] Companies:', companies.length, 'Persons:', persons.length)
console.log('[GlobeBridge] Clusters:', clusters.length, clusters.map(c => c.metroArea))
```
