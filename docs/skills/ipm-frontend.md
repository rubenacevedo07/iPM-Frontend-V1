# IPM Frontend — Core Skill

## Stack

- React 19, TypeScript 5.7+ strict, XState v5, TanStack Query v5, Vite 8, SCSS
- `verbatimModuleSyntax: true` → named imports only, no default `React` import
- `noUnusedLocals`, `noUnusedParameters` → clean up before every tsc run

## File layout

```
src/
  app/
    app.machine.ts          # Parallel 4-region top-level machine
    AppProviders.tsx        # QueryClientProvider + AppActor.Provider
    AppShell.tsx            # D1Page + conditional PersonOverlay
    styles/global.scss
  domain/
    types.ts                # Single source of truth for all types
    events.ts               # AppEvent union
    api.ts                  # apiFetch, apiGet, apiPost
    queries.ts              # qk key factories + fetchers
  machines/
    entity-inspector.machine.ts
    graph-interaction.machine.ts
    tabs.machine.ts
    auth.machine.ts
  features/
    d1-page/
      D1Page.tsx
    person-overlay/
      PersonOverlay.tsx         # Top-level router (cinematic/solo/relation/closed)
      PersonSoloView.tsx        # Solo layout — left panel + ego graph + node info
      PersonLeftPanel.tsx       # Left column — photo, scores, signals, supply chain
      ShapeEgoGraph.tsx         # Canvas 2D ego graph
      PersonNodeInfoPanel.tsx   # Floating panel for selected node
      StudioRelationView.tsx    # Relation layout — compact A | center | compact B
      CompactProfilePanel.tsx   # Left/right mini profile in relation view
      RelationCenterPanel.tsx   # Arc SVG + 4-tab analysis
      CinematicTransition.tsx   # Ken Burns 800ms transition
      person-overlay.machine.ts # Spawns inspector, graph, tabs machines
      personFallbackData.ts     # elonMuskFallback (id:7)
      sceneMap.ts               # getScene(id, type, name) → TransitionScene
      person-overlay.scss       # All overlay SCSS (~1100 lines)
```

## XState v5 patterns (mandatory)

```ts
// Machine definition
const myMachine = setup({
  types: {
    context: {} as { field: Type },
    events: {} as | { type: 'EVENT_A' } | { type: 'EVENT_B'; payload: string },
    input: {} as { initialValue: string },
  },
  guards: {
    myGuard: ({ context }) => context.field > 0,
  },
  actors: {
    myActor: fromPromise(async ({ input }: { input: string }) => {
      return await someApiCall(input)
    }),
  },
}).createMachine({
  id: 'myMachine',
  context: ({ input }) => ({ field: input.initialValue }),
  initial: 'idle',
  states: { ... },
})

// assign — always use function form
assign({ field: ({ event }) => event.value })
assign({ field: () => null })

// spawn in context factory
context: ({ spawn }) => ({
  childRef: spawn(childMachine, { input: { ... } }),
})

// React integration
const MyActor = createActorContext(myMachine)
// In component:
const ref = MyActor.useActorRef()
const value = MyActor.useSelector(s => s.context.field)
// Or for spawned children:
const value = useSelector(childRef, s => s.context.field)
```

## TanStack Query v5 patterns

```ts
const { data, isLoading } = useQuery({
  queryKey: qk.person(id),
  queryFn: () => fetchers.person(id),
  enabled: !!id,
  staleTime: 5 * 60 * 1000,
  retry: 1,
})
```

## Entity ID rules

| Field | Type | Example | Use for |
|---|---|---|---|
| `id` | `number` | `7` | API calls (`/persons/7`) |
| `nodeId` | `string` | `"person:7"` | Graph operations, query keys |
| `slug` | `string` | `"elon-musk"` | URL routing |

**Never** pass `id` where `nodeId` is expected. The `GraphNode.id` field IS a nodeId string.

## GraphNode → EntityRef conversion

```ts
function graphNodeToEntityRef(node: GraphNode): EntityRef {
  const [rawType, rawId] = node.id.split(':')
  const id = parseInt(rawId ?? '0', 10)
  const typeMap: Record<string, EntityType> = {
    person: 'PERSON', company: 'COMPANY', country: 'COUNTRY',
  }
  return {
    id: isNaN(id) ? 0 : id,
    nodeId: node.id,
    type: typeMap[rawType ?? ''] ?? 'PERSON',
    slug: node.name.toLowerCase().replace(/\s+/g, '-'),
    name: node.name,
  }
}
```

## Machine state flow

```
entityInspectorMachine:
  closed → cinematic (after:800 or CINEMATIC.COMPLETE) → solo
  solo → relationCinematic (RELATION.OPEN) → relation (after:800)
  solo/relation → closing (ENTITY.CLOSE) → closed (after:200)
  relation → solo (RELATION.CLOSE)

personOverlayMachine:
  spawns: inspectorRef, graphRef (instanceId input), tabsRef (initialTab:'overview')
  forwards: RELATION.OPEN → inspectorRef, RELATION.CLOSE → inspectorRef

appMachine (parallel):
  auth:    checking → authenticated | unauthenticated → authenticating → ...
  overlay: closed ↔ open (ENTITY.OPEN / ENTITY.CLOSE)
  d1:      globe | network | force
  focus:   idle | focused (stores focusedEntity: EntityRef | null)
```

## API layer

```ts
// src/domain/api.ts
// Auth: Bearer token from localStorage('ipm_access_token')
// 401 → remove token + dispatch CustomEvent('auth:expired')
apiGet<T>(path)    // GET /api{path}
apiPost<T>(path, body)  // POST /api{path}
```

Proxy: `/api` → `http://localhost:5000` (configured in vite.config.ts).

## SCSS namespace map

| Prefix | Component |
|---|---|
| `ov__` | Overlay shell (PersonSoloView root) |
| `pe__` | PersonLeftPanel |
| `sr__` | StudioRelationView + RelationCenterPanel |
| `cin__` | CinematicTransition |
| `ni__` | PersonNodeInfoPanel |
| `cp__` | CompactProfilePanel |
| `bb__` | Bottom bar |
| `eg__` | ShapeEgoGraph wrapper |
| `tab__` | Tab bar (shared) |

## Canvas (ShapeEgoGraph) rules

- Rendering: Canvas 2D only — no D3, no SVG for the ego graph
- Layout: polar orbit, `Math.min(W,H) * 0.58` radius, max 12 visible nodes
- Shapes: circle=person, square=company, hexagon=country, diamond=scenario, triangle=theme
- Hover: canvas-local only (`NODE.HOVER` never goes to XState)
- Click: calls `onNodeClick(nodeId)` prop → parent decides whether to cross XState boundary
- Pulse animation: only on `strength === 'Critical'` edges
- Cleanup: always cancel `requestAnimationFrame` and disconnect `ResizeObserver` in useEffect cleanup
