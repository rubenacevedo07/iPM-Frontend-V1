#!/bin/bash
# Phase 3.2 — wire engineManager into app.machine atlasView region
# Run from repo root: bash phase3_2_create_files.sh

set -e

# ─── Pre-flight ───────────────────────────────────────────────────────────────

echo "Check 1 — GlobeBridge.ts exists..."
if [ ! -f src/engine/GlobeBridge.ts ]; then
  echo "STOP: Phase 3.1 not complete — GlobeBridge.ts missing"
  exit 1
fi
echo "  ✅ GlobeBridge.ts found"

echo "Check 2 — engineManagerMachine export..."
if ! grep -q "export const engineManagerMachine" src/engine/engineManager.machine.ts; then
  echo "STOP: engineManagerMachine not exported"
  exit 1
fi
echo "  ✅ engineManagerMachine exported"

echo "Check 3 — no orphan ATLAS.READY references..."
COUNT=$(grep -rn "ATLAS.READY\|ATLAS_READY" src/ 2>/dev/null | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "STOP: Found ATLAS.READY references:"
  grep -rn "ATLAS.READY\|ATLAS_READY" src/
  exit 1
fi
echo "  ✅ No ATLAS.READY references"

echo ""
echo "Pre-flight passed. Applying changes..."
echo ""

# ─── File 1: src/types/atlas.ts (NEW) ────────────────────────────────────────

echo "Creating src/types/atlas.ts..."
cat > src/types/atlas.ts << 'EOF'
// src/types/atlas.ts
// AtlasView — frontend view-mode type for the AtlasView engine region.
// Not an API DTO — lives in types/ as a pure frontend domain type.

export type AtlasView = 'globe' | 'network' | 'force'
EOF

# ─── File 2: src/app/app.events.ts (MODIFY — append 3 events) ────────────────

echo "Updating src/app/app.events.ts — adding ATLAS events..."
cat > src/app/app.events.ts << 'EOF'
import type { WorkstationSearch } from '@/routes/workstation'
import type { AtlasView } from '@/types/atlas'
import type { EngineId } from '@/engine/contracts/inputs'

export type EntityRef = {
  id:     number
  nodeId: string
  type:   'PERSON' | 'COMPANY' | 'COUNTRY'
  slug:   string
  name:   string
}

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
  // AtlasView engine events
  | { type: 'ATLAS_VIEW.SET';      view: AtlasView }
  | { type: 'ATLAS.ENTITY_CLICK';  entity: EntityRef }
  | { type: 'ATLAS.ENGINE_FAILED'; engineId: EngineId; error: Error }
EOF

# ─── File 3: src/app/app.machine.ts (MODIFY) ─────────────────────────────────

echo "Updating src/app/app.machine.ts — adding atlasView region..."
cat > src/app/app.machine.ts << 'EOF'
import { setup, assign, sendTo } from 'xstate'
import { createActorContext } from '@xstate/react'
import type { ActorRefFrom } from 'xstate'
import deepEqual from 'fast-deep-equal'
import { navigationActor } from '@/navigation/navigationActor'
import { engineManagerMachine } from '@/engine/engineManager.machine'
import { deriveContextFromSearchParams } from './deriveContextFromSearchParams'
import type { AppEvent, EntityRef } from './app.events'
import type { WorkstationSearch } from '@/routes/workstation'
import type { AtlasView } from '@/types/atlas'

type AppContext = {
  overlayId:        number | null
  overlayIdB:       number | null
  query:            string
  focusedEntity:    EntityRef | null
  navRef:           ActorRefFrom<typeof navigationActor>
  engineManagerRef: ActorRefFrom<typeof engineManagerMachine>
  atlasView:        AtlasView
}

// Type-safe extractor — guard in setup() ensures event.type === 'URL_CHANGED' before use
function getSearch(event: AppEvent): WorkstationSearch | null {
  return event.type === 'URL_CHANGED' ? event.search : null
}

const appMachine = setup({
  types: {
    context: {} as AppContext,
    events:  {} as AppEvent,
  },
  actors: {
    navigationActor,
    engineManagerMachine,
  },
  guards: {
    urlActuallyChanged: ({ context, event }) => {
      if (event.type !== 'URL_CHANGED') return false
      const d = deriveContextFromSearchParams(event.search)
      return !deepEqual(
        { overlayId: context.overlayId, overlayIdB: context.overlayIdB, searchQuery: context.query },
        { overlayId: d.overlayId,       overlayIdB: d.overlayIdB,       searchQuery: d.searchQuery },
      )
    },
    isPersonUrl:  ({ event }) => event.type === 'URL_CHANGED' && event.search.overlay === 'person',
    isCompanyUrl: ({ event }) => event.type === 'URL_CHANGED' && event.search.overlay === 'company',
    isVsUrl:      ({ event }) => event.type === 'URL_CHANGED' && event.search.overlay === 'vs',
    noOverlayUrl: ({ event }) => event.type === 'URL_CHANGED' && !event.search.overlay,
  },
}).createMachine({
  id: 'app',
  type: 'parallel',
  context: ({ spawn }) => ({
    overlayId:        null,
    overlayIdB:       null,
    query:            '',
    focusedEntity:    null,
    navRef:           spawn(navigationActor,      { id: 'nav' }),
    engineManagerRef: spawn(engineManagerMachine, { id: 'engineManager' }),
    atlasView:        'globe' as AtlasView,
  }),
  states: {
    overlay: {
      initial: 'closed',
      states: {
        closed: {
          on: {
            OPEN_PERSON: {
              target: 'person',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'person' as const, id: event.id } })),
              ],
            },
            OPEN_COMPANY: {
              target: 'company',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'company' as const, id: event.id } })),
              ],
            },
            OPEN_VS: {
              target: 'vs',
              actions: [
                assign({ overlayId: ({ event }) => event.a, overlayIdB: ({ event }) => event.b }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'vs' as const, a: event.a, b: event.b } })),
              ],
            },
            URL_CHANGED: [
              { guard: 'isPersonUrl',  target: 'person',  actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null }) },
              { guard: 'isCompanyUrl', target: 'company', actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null }) },
              { guard: 'isVsUrl',      target: 'vs',      actions: assign({ overlayId: ({ event }) => getSearch(event)?.a   ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null }) },
            ],
          },
        },
        person: {
          on: {
            CLOSE_OVERLAY: {
              target: 'closed',
              actions: [
                assign({ overlayId: null, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, { type: 'NAVIGATE', search: {} }),
              ],
            },
            OPEN_COMPANY: {
              target: 'company',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'company' as const, id: event.id } })),
              ],
            },
            OPEN_VS: {
              target: 'vs',
              actions: [
                assign({ overlayId: ({ event }) => event.a, overlayIdB: ({ event }) => event.b }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'vs' as const, a: event.a, b: event.b } })),
              ],
            },
            URL_CHANGED: [
              { guard: 'noOverlayUrl', target: 'closed',  actions: assign({ overlayId: null, overlayIdB: null }) },
              { guard: 'isCompanyUrl', target: 'company', actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null }) },
              { guard: 'isVsUrl',      target: 'vs',      actions: assign({ overlayId: ({ event }) => getSearch(event)?.a   ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null }) },
            ],
          },
        },
        company: {
          on: {
            CLOSE_OVERLAY: {
              target: 'closed',
              actions: [
                assign({ overlayId: null, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, { type: 'NAVIGATE', search: {} }),
              ],
            },
            OPEN_PERSON: {
              target: 'person',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'person' as const, id: event.id } })),
              ],
            },
            OPEN_VS: {
              target: 'vs',
              actions: [
                assign({ overlayId: ({ event }) => event.a, overlayIdB: ({ event }) => event.b }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'vs' as const, a: event.a, b: event.b } })),
              ],
            },
            URL_CHANGED: [
              { guard: 'noOverlayUrl', target: 'closed', actions: assign({ overlayId: null, overlayIdB: null }) },
              { guard: 'isPersonUrl',  target: 'person', actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null }) },
              { guard: 'isVsUrl',      target: 'vs',     actions: assign({ overlayId: ({ event }) => getSearch(event)?.a   ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null }) },
            ],
          },
        },
        vs: {
          on: {
            CLOSE_OVERLAY: {
              target: 'closed',
              actions: [
                assign({ overlayId: null, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, { type: 'NAVIGATE', search: {} }),
              ],
            },
            OPEN_PERSON: {
              target: 'person',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'person' as const, id: event.id } })),
              ],
            },
            OPEN_COMPANY: {
              target: 'company',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'company' as const, id: event.id } })),
              ],
            },
            URL_CHANGED: [
              { guard: 'noOverlayUrl',  target: 'closed',  actions: assign({ overlayId: null, overlayIdB: null }) },
              { guard: 'isPersonUrl',   target: 'person',  actions: assign({ overlayId: ({ event }) => getSearch(event)?.id ?? null, overlayIdB: null }) },
              { guard: 'isCompanyUrl',  target: 'company', actions: assign({ overlayId: ({ event }) => getSearch(event)?.id ?? null, overlayIdB: null }) },
            ],
          },
        },
      },
    },

    search: {
      initial: 'idle',
      states: {
        idle:   { on: { SEARCH_OPEN: 'active' } },
        active: {
          on: {
            SEARCH_CLOSE: 'idle',
            SEARCH_QUERY: { actions: assign({ query: ({ event }) => event.q }) },
          },
        },
      },
    },

    auth: {
      initial: 'checking',
      states: {
        checking:        { always: 'authenticated' },
        authenticated:   {},
        unauthenticated: {},
      },
    },

    focus: {
      initial: 'idle',
      states: {
        idle:    { on: { FOCUS_ENTITY: { target: 'focused', actions: assign({ focusedEntity: ({ event }) => event.entity }) } } },
        focused: { on: { BLUR_ENTITY:  { target: 'idle',    actions: assign({ focusedEntity: null }) } } },
      },
    },

    // 5th region — flat event router (Decision B: no lifecycle duplication)
    // Engine lifecycle lives in engineManagerMachine (spawned in context).
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
  },

  on: {
    URL_CHANGED: {
      guard: 'urlActuallyChanged',
      actions: assign(({ event }) => {
        const e = event as Extract<AppEvent, { type: 'URL_CHANGED' }>
        const d = deriveContextFromSearchParams(e.search)
        return { overlayId: d.overlayId, overlayIdB: d.overlayIdB, query: d.searchQuery }
      }),
    },
  },
})

export const AppActor = createActorContext(appMachine)
export type { AppContext }
EOF

echo ""
echo "✅ Phase 3.2 files created/updated:"
echo "   src/types/atlas.ts              (new — AtlasView type)"
echo "   src/app/app.events.ts           (3 ATLAS events added)"
echo "   src/app/app.machine.ts          (atlasView region + engineManager spawn)"
echo ""
echo "Next: npx tsc --noEmit"
echo "If 0 errors: git add + commit"
