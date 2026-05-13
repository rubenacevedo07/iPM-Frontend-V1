import { setup, assign, sendTo, enqueueActions } from 'xstate'
import { createActorContext } from '@xstate/react'
import type { ActorRefFrom } from 'xstate'
import deepEqual from 'fast-deep-equal'
import { navigationActor } from '@/navigation/navigationActor'
import { engineManagerMachine } from '@/engine/engineManager.machine'
import { deriveContextFromSearchParams } from './deriveContextFromSearchParams'
import type { AppEvent, EntityRef } from './app.events'
import type { WorkstationSearch } from '@/routes/workstation'
import type { AtlasView } from '@/types/atlas'
import type { EngineArc } from '@/engine/contracts/inputs'

type AppContext = {
  overlayId:        number | null
  overlayIdB:       number | null
  powermapId:       string | null
  query:            string
  focusedEntity:    EntityRef | null
  navRef:           ActorRefFrom<typeof navigationActor>
  engineManagerRef: ActorRefFrom<typeof engineManagerMachine>
  atlasView:        AtlasView
  // Phase 8: arcs reflecting the currently-open company's network. Mirrors
  // what the active engine bridge has via CMD.SET_ARCS. Cleared on overlay
  // close, on overlay-id change (top-level URL_CHANGED), and dropped if a
  // late NETWORK_RESOLVED arrives for a non-current overlay (stale-id guard).
  companyArcs:      EngineArc[]
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
  // Phase 8: named actions. clearOverlay + navigateHome + dispatchClearArcs
  // are reused by all 6 sub-state CLOSE_OVERLAY / ENTITY.CLOSE handlers
  // (person, company, vs × CLOSE_OVERLAY + ENTITY.CLOSE alias).
  // dispatchClearArcs is idempotent thanks to the short-circuit gate in
  // GlobeBridge.send (no layer rebuild when both incoming and current arc
  // arrays are empty).
  actions: {
    clearOverlay:      assign({ overlayId: null, overlayIdB: null, powermapId: null, companyArcs: [] }),
    navigateHome:      sendTo(({ context }) => context.navRef,           { type: 'NAVIGATE', search: {} }),
    dispatchClearArcs: sendTo(({ context }) => context.engineManagerRef, { type: 'CMD.SET_ARCS', data: { arcs: [] } }),
  },
  guards: {
    urlActuallyChanged: ({ context, event }) => {
      if (event.type !== 'URL_CHANGED') return false
      const d = deriveContextFromSearchParams(event.search)
      return !deepEqual(
        { overlayId: context.overlayId, overlayIdB: context.overlayIdB, powermapId: context.powermapId, searchQuery: context.query },
        { overlayId: d.overlayId,       overlayIdB: d.overlayIdB,       powermapId: d.powermapId,       searchQuery: d.searchQuery },
      )
    },
    isCompanyUrl:  ({ event }) => event.type === 'URL_CHANGED' && event.search.overlay === 'company',
    isVsUrl:       ({ event }) => event.type === 'URL_CHANGED' && event.search.overlay === 'vs',
    isGoldUrl:     ({ event }) => event.type === 'URL_CHANGED' && event.search.overlay === 'gold',
    isPowermapUrl: ({ event }) => event.type === 'URL_CHANGED' && event.search.overlay === 'powermap',
    noOverlayUrl:  ({ event }) => event.type === 'URL_CHANGED' && !event.search.overlay,
    // Phase 8: stale-id guard for NETWORK_RESOLVED. Drops events whose
    // companyId no longer matches the open overlay (user closed/switched
    // overlays while the fetch was in flight).
    networkMatchesOverlay: ({ context, event }) =>
      event.type === 'NETWORK_RESOLVED' && event.companyId === context.overlayId,
    personNetworkMatchesOverlay: ({ context, event }) =>
      event.type === 'PERSON_NETWORK_RESOLVED' && event.personId === context.overlayId,
  },
}).createMachine({
  id: 'app',
  type: 'parallel',
  context: ({ spawn }) => ({
    overlayId:        null,
    overlayIdB:       null,
    powermapId:       null,
    query:            '',
    focusedEntity:    null,
    navRef:           spawn('navigationActor',      { id: 'nav' }),
    engineManagerRef: spawn('engineManagerMachine', { id: 'engineManager' }),
    atlasView:        'globe' as AtlasView,
    companyArcs:      [],
  }),
  states: {
    overlay: {
      initial: 'closed',
      states: {
        closed: {
          on: {
            OPEN_PERSON: {
              target: 'gold',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'gold' as const, id: event.id } })),
              ],
            },
            OPEN_COMPANY: {
              target: 'company',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'company' as const, id: event.id } })),
              ],
            },
            OPEN_VS: {
              target: 'vs',
              actions: [
                assign({ overlayId: ({ event }) => event.a, overlayIdB: ({ event }) => event.b, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'vs' as const, a: event.a, b: event.b } })),
              ],
            },
            OPEN_POWERMAP: {
              target: 'powermap',
              actions: [
                assign({ powermapId: ({ event }) => event.id, overlayId: null, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'powermap' as const, powermapId: event.id } })),
              ],
            },
            URL_CHANGED: [
              { guard: 'isCompanyUrl',  target: 'company',  actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null, powermapId: null }) },
              { guard: 'isVsUrl',       target: 'vs',       actions: assign({ overlayId: ({ event }) => getSearch(event)?.a   ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null, powermapId: null }) },
              { guard: 'isGoldUrl',     target: 'gold',     actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null, powermapId: null }) },
              { guard: 'isPowermapUrl', target: 'powermap', actions: assign({ overlayId: null, overlayIdB: null, powermapId: ({ event }) => getSearch(event)?.powermapId ?? null }) },
            ],
          },
        },
        company: {
          on: {
            CLOSE_OVERLAY: {
              target: 'closed',
              actions: ['clearOverlay', 'navigateHome', 'dispatchClearArcs'],
            },
            // Phase 6: v3 canonical PersonOverlay dispatches ENTITY.CLOSE on close.
            // Handled as alias for CLOSE_OVERLAY so canonical stays untouched (Rule 6).
            'ENTITY.CLOSE': {
              target: 'closed',
              actions: ['clearOverlay', 'navigateHome', 'dispatchClearArcs'],
            },
            OPEN_PERSON: {
              target: 'gold',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'gold' as const, id: event.id } })),
              ],
            },
            OPEN_VS: {
              target: 'vs',
              actions: [
                assign({ overlayId: ({ event }) => event.a, overlayIdB: ({ event }) => event.b, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'vs' as const, a: event.a, b: event.b } })),
              ],
            },
            OPEN_POWERMAP: {
              target: 'powermap',
              actions: [
                assign({ powermapId: ({ event }) => event.id, overlayId: null, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'powermap' as const, powermapId: event.id } })),
              ],
            },
            URL_CHANGED: [
              { guard: 'noOverlayUrl',  target: 'closed',   actions: assign({ overlayId: null, overlayIdB: null, powermapId: null }) },
              { guard: 'isVsUrl',       target: 'vs',       actions: assign({ overlayId: ({ event }) => getSearch(event)?.a   ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null, powermapId: null }) },
              { guard: 'isGoldUrl',     target: 'gold',     actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null, powermapId: null }) },
              { guard: 'isPowermapUrl', target: 'powermap', actions: assign({ overlayId: null, overlayIdB: null, powermapId: ({ event }) => getSearch(event)?.powermapId ?? null }) },
            ],
          },
        },
        vs: {
          on: {
            CLOSE_OVERLAY: {
              target: 'closed',
              actions: ['clearOverlay', 'navigateHome', 'dispatchClearArcs'],
            },
            // Phase 6: v3 canonical PersonOverlay dispatches ENTITY.CLOSE on close.
            // Handled as alias for CLOSE_OVERLAY so canonical stays untouched (Rule 6).
            'ENTITY.CLOSE': {
              target: 'closed',
              actions: ['clearOverlay', 'navigateHome', 'dispatchClearArcs'],
            },
            OPEN_PERSON: {
              target: 'gold',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'gold' as const, id: event.id } })),
              ],
            },
            OPEN_COMPANY: {
              target: 'company',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'company' as const, id: event.id } })),
              ],
            },
            OPEN_POWERMAP: {
              target: 'powermap',
              actions: [
                assign({ powermapId: ({ event }) => event.id, overlayId: null, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'powermap' as const, powermapId: event.id } })),
              ],
            },
            URL_CHANGED: [
              { guard: 'noOverlayUrl',  target: 'closed',   actions: assign({ overlayId: null, overlayIdB: null, powermapId: null }) },
              { guard: 'isCompanyUrl',  target: 'company',  actions: assign({ overlayId: ({ event }) => getSearch(event)?.id ?? null, overlayIdB: null, powermapId: null }) },
              { guard: 'isGoldUrl',     target: 'gold',     actions: assign({ overlayId: ({ event }) => getSearch(event)?.id ?? null, overlayIdB: null, powermapId: null }) },
              { guard: 'isPowermapUrl', target: 'powermap', actions: assign({ overlayId: null, overlayIdB: null, powermapId: ({ event }) => getSearch(event)?.powermapId ?? null }) },
            ],
          },
        },
        gold: {
          on: {
            CLOSE_OVERLAY: {
              target: 'closed',
              actions: ['clearOverlay', 'navigateHome', 'dispatchClearArcs'],
            },
            'ENTITY.CLOSE': {
              target: 'closed',
              actions: ['clearOverlay', 'navigateHome', 'dispatchClearArcs'],
            },
            OPEN_PERSON: {
              target: 'gold',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'gold' as const, id: event.id } })),
              ],
            },
            OPEN_COMPANY: {
              target: 'company',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'company' as const, id: event.id } })),
              ],
            },
            OPEN_VS: {
              target: 'vs',
              actions: [
                assign({ overlayId: ({ event }) => event.a, overlayIdB: ({ event }) => event.b, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'vs' as const, a: event.a, b: event.b } })),
              ],
            },
            OPEN_POWERMAP: {
              target: 'powermap',
              actions: [
                assign({ powermapId: ({ event }) => event.id, overlayId: null, overlayIdB: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'powermap' as const, powermapId: event.id } })),
              ],
            },
            URL_CHANGED: [
              { guard: 'noOverlayUrl',  target: 'closed',   actions: assign({ overlayId: null, overlayIdB: null, powermapId: null }) },
              { guard: 'isCompanyUrl',  target: 'company',  actions: assign({ overlayId: ({ event }) => getSearch(event)?.id ?? null, overlayIdB: null, powermapId: null }) },
              { guard: 'isVsUrl',       target: 'vs',       actions: assign({ overlayId: ({ event }) => getSearch(event)?.a  ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null, powermapId: null }) },
              { guard: 'isPowermapUrl', target: 'powermap', actions: assign({ overlayId: null, overlayIdB: null, powermapId: ({ event }) => getSearch(event)?.powermapId ?? null }) },
            ],
            PERSON_NETWORK_RESOLVED: {
              guard: 'personNetworkMatchesOverlay',
              actions: [
                assign({ companyArcs: ({ event }) => event.type === 'PERSON_NETWORK_RESOLVED' ? event.arcs : [] }),
                sendTo(({ context }) => context.engineManagerRef, ({ event }) => ({
                  type: 'CMD.SET_ARCS' as const,
                  data: { arcs: event.type === 'PERSON_NETWORK_RESOLVED' ? event.arcs : [] },
                })),
              ],
            },
          },
        },
        powermap: {
          on: {
            CLOSE_OVERLAY:  { target: 'closed', actions: ['clearOverlay', 'navigateHome', 'dispatchClearArcs'] },
            'ENTITY.CLOSE': { target: 'closed', actions: ['clearOverlay', 'navigateHome', 'dispatchClearArcs'] },
            OPEN_PERSON: {
              target: 'gold',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'gold' as const, id: event.id } })),
              ],
            },
            OPEN_COMPANY: {
              target: 'company',
              actions: [
                assign({ overlayId: ({ event }) => event.id, overlayIdB: null, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'company' as const, id: event.id } })),
              ],
            },
            OPEN_VS: {
              target: 'vs',
              actions: [
                assign({ overlayId: ({ event }) => event.a, overlayIdB: ({ event }) => event.b, powermapId: null }),
                sendTo(({ context }) => context.navRef, ({ event }) => ({ type: 'NAVIGATE', search: { overlay: 'vs' as const, a: event.a, b: event.b } })),
              ],
            },
            URL_CHANGED: [
              { guard: 'noOverlayUrl', target: 'closed',  actions: assign({ overlayId: null, overlayIdB: null, powermapId: null }) },
              { guard: 'isCompanyUrl', target: 'company', actions: assign({ overlayId: ({ event }) => getSearch(event)?.id ?? null, overlayIdB: null, powermapId: null }) },
              { guard: 'isVsUrl',      target: 'vs',      actions: assign({ overlayId: ({ event }) => getSearch(event)?.a  ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null, powermapId: null }) },
              { guard: 'isGoldUrl',    target: 'gold',    actions: assign({ overlayId: ({ event }) => getSearch(event)?.id ?? null, overlayIdB: null, powermapId: null }) },
            ],
          },
        },
      },
    },

    search: {
      initial: 'idle',
      states: {
        idle:   { on: { SEARCH_OPEN: 'active', SEARCH_QUERY: { actions: assign({ query: ({ event }) => event.q }) } } },
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
            // PERSON entity click. If the entity was pre-tagged in AppShell
            // with a coLocatedCompanyId (i.e. the person is the CEO of a
            // company at the same headquarters), open the HEADQUARTERS dual
            // overlay (?overlay=hq). Otherwise fall back to the single gold
            // overlay (?overlay=gold).
            guard: ({ event }) => event.entity.type === 'PERSON',
            actions: sendTo(
              ({ context }) => context.navRef,
              ({ event }) => {
                if (event.type !== 'ATLAS.ENTITY_CLICK') {
                  return { type: 'NAVIGATE' as const, search: {} }
                }
                const co = event.entity.coLocatedCompanyId
                if (typeof co === 'number') {
                  return {
                    type: 'NAVIGATE' as const,
                    search: { overlay: 'hq' as const, personId: event.entity.id, companyId: co },
                  }
                }
                return {
                  type: 'NAVIGATE' as const,
                  search: { overlay: 'gold' as const, id: event.entity.id },
                }
              }
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
      // Phase 8: keep context.companyArcs and the active bridge in sync.
      // - overlayId changed (close, open-different, switch-overlay-kind):
      //   clear arcs in context AND dispatch CMD.SET_ARCS empty to bridge.
      // - only query / overlayIdB changed: assign new context, keep arcs.
      actions: enqueueActions(({ enqueue, context, event }) => {
        const e = event as Extract<AppEvent, { type: 'URL_CHANGED' }>
        const d = deriveContextFromSearchParams(e.search)
        const overlayChanged =
          d.overlayId !== context.overlayId ||
          d.powermapId !== context.powermapId
        if (overlayChanged) {
          enqueue.assign({
            overlayId: d.overlayId, overlayIdB: d.overlayIdB,
            powermapId: d.powermapId,
            query: d.searchQuery, companyArcs: [],
          })
          enqueue('dispatchClearArcs')
        } else {
          enqueue.assign({
            overlayId: d.overlayId, overlayIdB: d.overlayIdB,
            powermapId: d.powermapId, query: d.searchQuery,
          })
        }
      }),
    },
    // Phase 8: provider/client network resolved by CompanyOverlayHost. Guard
    // checks the event's companyId against the currently open overlay; if the
    // user switched/closed before the fetch settled, the event is dropped.
    NETWORK_RESOLVED: {
      guard: 'networkMatchesOverlay',
      actions: [
        assign({
          companyArcs: ({ event }) =>
            event.type === 'NETWORK_RESOLVED' ? event.arcs : [],
        }),
        sendTo(
          ({ context }) => context.engineManagerRef,
          ({ event }) => ({
            type: 'CMD.SET_ARCS' as const,
            data: { arcs: event.type === 'NETWORK_RESOLVED' ? event.arcs : [] },
          }),
        ),
      ],
    },
  },
})

export const AppActor = createActorContext(appMachine)
export type { AppContext }
