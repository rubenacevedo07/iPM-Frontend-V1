---
name: ipm-frontend-v1-sprint
description: >
  Critical reference for IPM Frontend V1 sprint execution. Use BEFORE any edit
  to app.machine.ts, app.events.ts, routes, or engine files. Contains exact
  type shapes, file paths, import aliases, event contracts, and sprint state.
  Triggers on: app.machine, app.events, AppEvent, EntityRef, AtlasView,
  NAVIGATE event, WorkstationSearch, overlay search params, engine wiring,
  atlasView region, Phase 3, sprint state, pre-flight checks, type shapes,
  import paths, domain types. Load this BEFORE any file edit — prevents
  type mismatches and wrong import paths that are the primary time sink.
---

# IPM Frontend V1 — Sprint Reference

## SPRINT STATE

| Tag | Commit | Content |
|---|---|---|
| `v1-phase-2a` | `3f488ef` | URL ↔ machine bidireccional |
| `v1-phase-2b` | `a8a579c` | Engine contracts + factory + EngineManager + EngineSlot |
| `v1-phase-3a` | `fc60f05` | GlobeBridge real DeckGL, bridge.ts cleanup |

**Current branch:** master  
**Next:** Phase 3.2 — wire engineManager into app.machine atlasView region

---

## REPO STRUCTURE (critical paths)

```
src/
├── app/
│   ├── app.machine.ts        ← root XState machine
│   ├── app.events.ts         ← AppEvent union + EntityRef type
│   └── deriveContextFromSearchParams.ts
├── engine/
│   ├── GlobeBridge.ts        ← real DeckGL bridge (Phase 3a)
│   ├── engineFactory.ts      ← createEngine() sync factory
│   ├── engineManager.machine.ts
│   └── contracts/
│       ├── inputs.ts         ← EngineId, EngineInitInput
│       ├── engine.ts         ← IEngine, EngineDescriptor
│       └── bridge.ts         ← IEngineBridge, BridgeEvent, BridgeCommand, Unsubscribe
├── types/                    ← NO domain/ folder — types live here
├── navigation/
│   └── navigationActor.ts
├── routes/
│   └── workstation.tsx       ← WorkstationSearch type + Zod schema
└── components/
    └── EngineSlot/
        ├── EngineSlot.tsx
        └── EngineSlot.module.scss
```

**CRITICAL:** No `src/domain/` folder exists. Types are in `src/types/`.

---

## EXACT TYPE SHAPES

### EntityRef — defined in `src/app/app.events.ts`
```typescript
export type EntityRef = {
  id:     number
  nodeId: string
  type:   'PERSON' | 'COMPANY' | 'COUNTRY'
  slug:   string
  name:   string
}
```
**Guards use:** `event.entity.type === 'PERSON'` (uppercase)  
**Navigate uses:** `event.entity.id` (number)

### AppEvent — defined in `src/app/app.events.ts`
```typescript
export type AppEvent =
  | { type: 'URL_CHANGED';  search: WorkstationSearch }
  | { type: 'OPEN_PERSON';  id: number }
  | { type: 'OPEN_COMPANY'; id: number }
  | { type: 'OPEN_VS';      a: number; b: number }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'SEARCH_OPEN' }
  | { type: 'SEARCH_CLOSE' }
  | { type: 'SEARCH_QUERY'; q: string }
  | { type: 'FOCUS_ENTITY'; entity: EntityRef }
  | { type: 'BLUR_ENTITY' }
```
**To add new events:** append to this union in `app.events.ts`.

### AtlasView — NOT YET IN REPO
Must be added to `src/types/` before use in app.machine.ts:
```typescript
export type AtlasView = 'globe' | 'network' | 'force'
```
**Add to:** `src/types/atlas.ts` or whichever types file is appropriate.  
**Then import as:** `import type { AtlasView } from '@/types/atlas'`  
Check existing files in `src/types/` before creating new one.

### EngineId — defined in `src/engine/contracts/inputs.ts`
```typescript
export type EngineId = 'globe' | 'network' | 'force'
```

### NAVIGATE event shape — from `src/navigation/navigationActor.ts`
```typescript
{ type: 'NAVIGATE', search: { overlay: 'person' as const, id: number } }
{ type: 'NAVIGATE', search: { overlay: 'company' as const, id: number } }
{ type: 'NAVIGATE', search: { overlay: 'vs' as const, a: number, b: number } }
{ type: 'NAVIGATE', search: {} }  // close overlay
```
**Rule 3:** NEVER call `router.navigate()` from components. Always via `navRef`.

### WorkstationSearch — defined in `src/routes/workstation.tsx`
overlay values: `'person' | 'company' | 'vs'` (or absent)

---

## APP.MACHINE CURRENT STATE (v1-phase-3a)

### Imports block
```typescript
import { setup, assign, sendTo } from 'xstate'
import { createActorContext } from '@xstate/react'
import type { ActorRefFrom } from 'xstate'
import deepEqual from 'fast-deep-equal'
import { navigationActor } from '@/navigation/navigationActor'
import { deriveContextFromSearchParams } from './deriveContextFromSearchParams'
import type { AppEvent, EntityRef } from './app.events'
import type { WorkstationSearch } from '@/routes/workstation'
```

### AppContext current shape
```typescript
type AppContext = {
  overlayId:     number | null
  overlayIdB:    number | null
  query:         string
  focusedEntity: EntityRef | null
  navRef:        ActorRefFrom<typeof navigationActor>
}
```

### setup() actors block
```typescript
actors: { navigationActor },
```

### context initializer
```typescript
context: ({ spawn }) => ({
  overlayId:     null,
  overlayIdB:    null,
  query:         '',
  focusedEntity: null,
  navRef:        spawn(navigationActor, { id: 'nav' }),
}),
```

### 4 parallel regions (flat, no nesting)
`overlay` (closed|person|company|vs) · `search` (idle|active) · `auth` (checking|authenticated|unauthenticated) · `focus` (idle|focused)

---

## PHASE 3.2 EDIT SPEC (locked decisions)

### Decision B (locked): atlasView is flat — pure event router
No `initial:`, no `states:` nesting, no lifecycle duplication.
EngineManager owns the engine lifecycle. app.machine.atlasView owns routing only.

### New events to add to AppEvent union (app.events.ts)
```typescript
| { type: 'ATLAS_VIEW.SET';      view: AtlasView }
| { type: 'ATLAS.ENTITY_CLICK';  entity: EntityRef }
| { type: 'ATLAS.ENGINE_FAILED'; engineId: EngineId; error: Error }
```

### New context fields (app.machine.ts AppContext)
```typescript
engineManagerRef: ActorRefFrom<typeof engineManagerMachine>
atlasView:        AtlasView
```

### New imports needed (app.machine.ts)
```typescript
import { engineManagerMachine } from '@/engine/engineManager.machine'
import type { AtlasView } from '@/types/...'   // confirm path first
```

### atlasView region (exact structure)
```typescript
atlasView: {
  on: {
    'ATLAS_VIEW.SET': {
      actions: assign({ atlasView: ({ event }) => event.view }),
    },
    'ATLAS.ENTITY_CLICK': [
      {
        guard: ({ event }) => event.entity.type === 'PERSON',
        actions: sendTo(
          ({ context }) => context.navRef,
          ({ event }) => ({
            type: 'NAVIGATE',
            search: { overlay: 'person' as const, id: event.entity.id },
          })
        ),
      },
      {
        guard: ({ event }) => event.entity.type === 'COMPANY',
        actions: sendTo(
          ({ context }) => context.navRef,
          ({ event }) => ({
            type: 'NAVIGATE',
            search: { overlay: 'company' as const, id: event.entity.id },
          })
        ),
      },
    ],
    'ATLAS.ENGINE_FAILED': {
      actions: ({ event }) => console.error('[EngineManager] engine failed', event),
    },
  },
},
```

### context initializer additions
```typescript
engineManagerRef: spawn(engineManagerMachine, { id: 'engineManager' }),
atlasView:        'globe' as AtlasView,
```

---

## 6 NON-NEGOTIABLE RULES (sprint 1)

1. **NO handwritten types** — use types from `src/types/` (v3 verbatim, 43 files)
2. **NO fetch() outside apiClient.ts** — services layer is the only network egress
3. **NO router.navigate() from components** — only via `navigationActor` (single-writer)
4. **NO DTOs in features/engine** — contracts in `engine/contracts/` are pure
5. **NO R3F** — DeckGL imperative only: `new Deck({...})`, `deck.setProps()`
6. **NO refactor of v3-copied code** — verbatim; corrections documented in commits

---

## ADR-0001 DECISIONS (immutable during sprint 1)

1. Zod for searchParams — `z.coerce.number().int().positive()` pattern
2. `useAuth` + `useGlobeTheme` remain stubs (dev auto-login)
3. URL sync via `urlActuallyChanged` guard with `fast-deep-equal` — no flags/refs
4. app.machine: 4 flat parallel regions — **restriction expired with Phase 2b close**
   Phase 3+ may add 5th region (atlasView)

---

## COMMON ERRORS & FIXES

| Error | Cause | Fix |
|---|---|---|
| `Property 'type' does not exist on EntityRef` | Used lowercase `'person'` | EntityRef.type is `'PERSON'` uppercase |
| `Cannot find module '@/domain/types'` | No domain/ folder | Import from `@/types/` |
| `AtlasView not found` | Not yet in repo | Add to `src/types/` first |
| `sendTo is not defined` | Missing import | Add `sendTo` to xstate import |
| `assign({ field: null })` XState error | v5 syntax | Use `assign({ field: () => null })` |
| Globe renders small | `_GlobeView` ignores CSS | Use ResizeObserver + explicit width/height |
| DeckGL double-mount assertion | React.StrictMode | Remove StrictMode from main.tsx |
