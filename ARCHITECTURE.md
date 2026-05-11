# iPM V1 — Frontend Architecture

**Status:** Sprint 1 complete. Production build green. TypeScript clean.
**Last updated:** 2026-05-09
**Audience:** Contributors onboarding, Sprint 2 planning, design decisions.

---

## 1. Stack

| Layer | Library | Version |
|---|---|---|
| UI | React | 19.2.4 |
| Build | Vite + TypeScript | 8.0.4 / 6.0.2 |
| State | XState | 5.30.0 |
| Routing | TanStack Router | 1.168.22 |
| Data | TanStack Query | 5.99.0 |
| Schema | Zod | 4.3.6 |
| Globe | deck.gl | 9.3.0 |
| Graph | @xyflow/react | 12.10.2 |
| Animation | framer-motion | 12.38.0 |
| Styling | SCSS Modules | Sass 1.99.0 |

---

## 2. App Machine — 5 Parallel Regions

The `app.machine` runs as a single XState v5 actor with five orthogonal parallel regions. Each region tracks an independent concern.

### Regions

| Region | States | Purpose |
|---|---|---|
| `overlay` | closed → person \| company \| vs \| gold | Active entity overlay panel |
| `search` | idle ↔ active | Workstation search palette state |
| `auth` | checking → authenticated \| unauthenticated | Auth state (currently stub, real OAuth in Sprint 2) |
| `focus` | idle ↔ focused | Cinematic focus mode for entity zoom |
| `atlasView` | globe \| graph (network) | Active visualization layer |

### AppContext shape

```typescript
interface AppContext {
  selectedEntityRef: EntityRef | null;
  searchQuery: string;
  user: AuthUser | null;
  comparisonRefs: { a?: EntityRef; b?: EntityRef };
  pendingURLState: AppURLState | null;
  // ... region-specific fields
}
```

### Key guards

- `urlActuallyChanged` — uses `fast-deep-equal` to prevent URL-sync loops between TanStack Router and machine state
- `isGoldCompanyClick` — discriminates Gold overlay click from regular company entity click on globe
- `hasPendingURLState` — gates URL-driven transitions during boot

### Named actions

- `clearOverlay` — closes any overlay, clears `selectedEntityRef`, dispatches `CLEAR_ARCS` to engine
- `navigateHome` — resets to `/` index route, clears all parallel region state
- `dispatchClearArcs` — fire-and-forget event to deck.gl globe to remove ArcLayer instances
- `syncURLToMachine` — receives `URL_CHANGED` events from router, hydrates context

### Sprint 2 review note

Currently 5 parallel regions. ADR-0001 sets soft cap at 4. If a 6th region is proposed in Sprint 2, refactor `focus` into `overlay` substate first.

---

## 3. Routing

Code-based TanStack Router (no file-based plugin). Two routes total.

### Routes

| Path | Component | Search params |
|---|---|---|
| `/` | IndexRoute | none |
| `/workstation` | AppShell | `overlay`, `id`, `a`, `b`, `q` |

### Search param schema (Zod-validated)

```typescript
const workstationSearchSchema = z.object({
  overlay: z.enum(['person', 'company', 'vs', 'gold']).optional(),
  id: z.string().optional(),
  a: z.string().optional(),  // comparison left
  b: z.string().optional(),  // comparison right
  q: z.string().optional(),  // search query
});
```

### URL ↔ Machine sync

The router is the source of truth for URL state. The machine receives `URL_CHANGED` events from a router subscription and reconciles its parallel region state via `syncURLToMachine`. The `urlActuallyChanged` guard (using fast-deep-equal) prevents infinite loops.

**Components never call `router.navigate()` directly.** All navigation flows through the machine: `send({ type: 'NAVIGATE', target })` → action dispatches navigate → URL updates → router subscription emits → machine syncs. URL is derived state.

---

## 4. Component Map

```
AppShell
├── TopBar
│   ├── Breadcrumb (dynamic from selectedEntityRef)
│   ├── ViewTabs (atlasView region selector)
│   └── UserChip (auth state)
├── EngineSlot
│   └── GlobeEngine (deck.gl _GlobeView, auto-rotate, ArcLayer)
├── GraphViewPanel
│   └── ReactFlow (mock data — Sprint 2 wires real graphService)
├── AtlasViewToggle (globe ↔ graph)
├── CompanyOverlayHost
│   └── CompanyOverlay (NVIDIA live data)
├── PersonOverlayHost
│   ├── PersonOverlay (Elon Musk live data)
│   └── EgoGraphPanel (k=2 ego subgraph)
└── GoldOverlayHost
    └── GoldOverlay
        ├── PersonLeftPanel
        ├── KeyConnectionsPanel (floating)
        ├── KeyClientsPanel (floating)
        └── KeyDataPanel (floating)
```

### Notes

- `EngineSlot` and `GraphViewPanel` mount conditionally based on `atlasView` region
- Cinematic transition globe → graph uses framer-motion + deck.gl camera flyTo
- Overlay hosts each subscribe to `app.machine` overlay region with selectors

---

## 5. Services Layer

36 files in `src/services/`. Single network egress through `apiClient.ts`.

### Architecture

```
Components / Hooks
       ↓
Service modules (entity, intelligence, network, risk, ...)
       ↓
Mappers (at service boundary)
       ↓
apiClient.ts (Bearer token, 401 auto-refresh)
       ↓
Backend (ASP.NET Core 8)
```

### Real implementations

| Service | Purpose |
|---|---|
| `entityService` | Entity lookup by NodeId, search, batch fetch |
| `intelligenceService` | Person intelligence, ego subgraph, biographical |
| `networkService` | Company supplier/client/partner networks |
| `riskService` | Country and entity risk scores |
| `commodityService` | Gold and commodity flows |
| `newsService` | Recent news per entity |
| `marketService` | Market data (stocks, FX, indices) |
| `geopoliticalService` | Geopolitical context, country relations |

### Mappers

Mappers convert backend DTOs to frontend domain types **at the service boundary** (not in components).

- `companyNetworkMapper.ts` — backend network response → ArcLayer-ready edges
- `personNetworkMapper.ts` — person ego graph → ReactFlow nodes + edges

### Auth

Currently stub: `useAuth()` hook returns hardcoded user. Sprint 2 replaces with real OAuth flow against backend `/auth/*` endpoints.

---

## 6. Types

39 files in `src/types/`.

**Rule 6 (locked for Sprint 1):** verbatim from v3 — no refactoring of types until post-Sprint-1. No `_ext/` override directory currently exists. All type imports use canonical paths.

This is intentional: type churn during Sprint 1 caused 3 build breaks before the rule was added. Stability over elegance until Sprint 2.

---

## 7. Sprint 1 Status

### Working

- Globe full-bleed with auto-rotation (deck.gl imperative API, sustained 60fps)
- Company overlay with live data (NVIDIA via `useCompanyById`)
- Person overlay with live data (Elon Musk via `usePersonIntelligence`)
- Gold overlay with floating panels (Key Connections, Key Clients, Key Data)
- ArcLayer rendering for supplier / client / connection / partner networks
- ReactFlow graph panel with cinematic globe → graph transition
- TopBar with dynamic breadcrumb, view tabs, user chip
- Production build green
- TypeScript: 0 errors (`npx tsc --noEmit` clean)

### Deferred / known debt

| Item | Notes |
|---|---|
| GATE C heap profiling | Manual: 20x open/close cycles, verify no growth |
| `PHASE_8_DEBT.md` | Arc animation tweaks, label caching pending |
| Real OAuth | Replace `useAuth()` stub in Sprint 2 |
| `VsOverlay` | Skeleton only — deep implementation Sprint 2 |
| `GraphEngine` | Three.js + Worker thread planned for Sprint 2 |
| Risk fill layers | Phase 7.1/7.2 backlog (country RiskScore > 60) |
| Graph real data | Currently mock — wire to `graphService.getSubgraph()` |

---

## 8. Architectural Decisions (ADR-0001)

1. **Zod for searchParams**, not openapi-typescript. Reason: search params are UI state, not backend contract. Zod gives runtime validation + type inference without coupling routes to API schema.

2. **URL is derived state.** Components never call `router.navigate()` directly. All navigation flows through `app.machine` events. The router is read-only from the component perspective — it observes machine state and the machine observes router URL changes.

3. **fast-deep-equal guard prevents URL-sync loops.** Without `urlActuallyChanged`, `URL_CHANGED` → `syncURLToMachine` → action calls navigate → router emits → infinite loop. The deep equality check on the URL state object breaks the cycle.

4. **4 flat parallel regions max in app.machine.** Currently at 5 (added `atlasView`). Sprint 2 should review whether `focus` can collapse into an `overlay` substate to return to 4.

5. **Code-based routing only.** No file-based plugin. Reason: code-based gives full type inference at the route definition site and avoids magic file-system coupling. Cost is verbosity; benefit is debuggability.

---

## 9. Sprint 2 Roadmap

### Tier 1 (must)

- Wire `GraphViewPanel` to real `graphService.getSubgraph()` API
- Replace `useAuth()` stub with real OAuth flow
- `VsOverlay` deep implementation (dual entity comparison view)

### Tier 2 (should)

- Three.js `GraphEngine` in Worker thread (offload force layout from main thread)
- Globe risk fill layers (country RiskScore > 60 colored overlay)
- GATE C manual heap verification

### Tier 3 (could)

- Reduce parallel regions back to 4 (collapse `focus` into `overlay` substate)
- Animation polish from `PHASE_8_DEBT.md`
- Label caching optimization

---

## 10. File Locations

```
src/
├── App.tsx
├── main.tsx
├── machine/
│   ├── app.machine.ts
│   ├── app.events.ts
│   └── app.guards.ts
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   └── workstation.tsx
├── components/
│   ├── shell/AppShell.tsx
│   ├── shell/TopBar.tsx
│   ├── overlays/CompanyOverlay.tsx
│   ├── overlays/PersonOverlay.tsx
│   ├── overlays/GoldOverlay.tsx
│   ├── overlays/VsOverlay.tsx
│   ├── globe/GlobeEngine.tsx
│   └── graph/GraphViewPanel.tsx
├── services/
│   ├── api/apiClient.ts
│   ├── entityService.ts
│   ├── intelligenceService.ts
│   └── ... (36 files total)
├── types/
│   └── ... (39 files, Rule 6 locked)
├── hooks/
│   ├── useCompanyById.ts
│   ├── usePersonIntelligence.ts
│   └── useAuth.ts
└── styles/
    └── ... (SCSS modules)

docs/
└── ARCHITECTURE.md (this file)
```

---

## 11. Verification

```bash
# TypeScript clean
npx tsc --noEmit

# Production build
npm run build

# Dev server
npm run dev
```

All three should complete without errors at the time of this document.

---

## 12. Cross-references

- Backend architecture: see `IPM_Wave1_Frozen_Architecture.md`
- Roadmap waves: see `IPM_Roadmap_Next_Steps.md`
- Architectural decisions: see `IPM_Decisions_ADR_Index.md`
- Design system tokens: see skill `ipm-frontend-design-system`
- State machine details: see skill `ipm-frontend`
