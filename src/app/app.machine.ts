import { setup, assign } from 'xstate'
import { createActorContext } from '@xstate/react'
import type { ActorRefFrom } from 'xstate'
import deepEqual from 'fast-deep-equal'
import { navigationActor } from '@/navigation/navigationActor'
import { deriveContextFromSearchParams } from './deriveContextFromSearchParams'
import type { AppEvent, EntityRef } from './app.events'
import type { WorkstationSearch } from '@/routes/workstation'

type AppContext = {
  overlayId:     number | null
  overlayIdB:    number | null
  query:         string
  focusedEntity: EntityRef | null
  navRef:        ActorRefFrom<typeof navigationActor>
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
  actors: { navigationActor },
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
    overlayId:     null,
    overlayIdB:    null,
    query:         '',
    focusedEntity: null,
    navRef:        spawn(navigationActor, { id: 'nav' }),
  }),
  states: {
    overlay: {
      initial: 'closed',
      states: {
        closed: {
          on: {
            OPEN_PERSON:  { target: 'person',  actions: assign({ overlayId: ({ event }) => event.id, overlayIdB: null }) },
            OPEN_COMPANY: { target: 'company', actions: assign({ overlayId: ({ event }) => event.id, overlayIdB: null }) },
            OPEN_VS:      { target: 'vs',      actions: assign({ overlayId: ({ event }) => event.a,  overlayIdB: ({ event }) => event.b }) },
            URL_CHANGED: [
              { guard: 'isPersonUrl',  target: 'person',  actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null }) },
              { guard: 'isCompanyUrl', target: 'company', actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null }) },
              { guard: 'isVsUrl',      target: 'vs',      actions: assign({ overlayId: ({ event }) => getSearch(event)?.a   ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null }) },
            ],
          },
        },
        person: {
          on: {
            CLOSE_OVERLAY: { target: 'closed',  actions: assign({ overlayId: null, overlayIdB: null }) },
            OPEN_COMPANY:  { target: 'company', actions: assign({ overlayId: ({ event }) => event.id, overlayIdB: null }) },
            OPEN_VS:       { target: 'vs',      actions: assign({ overlayId: ({ event }) => event.a,  overlayIdB: ({ event }) => event.b }) },
            URL_CHANGED: [
              { guard: 'noOverlayUrl', target: 'closed',  actions: assign({ overlayId: null, overlayIdB: null }) },
              { guard: 'isCompanyUrl', target: 'company', actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null }) },
              { guard: 'isVsUrl',      target: 'vs',      actions: assign({ overlayId: ({ event }) => getSearch(event)?.a   ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null }) },
            ],
          },
        },
        company: {
          on: {
            CLOSE_OVERLAY: { target: 'closed', actions: assign({ overlayId: null, overlayIdB: null }) },
            OPEN_PERSON:   { target: 'person', actions: assign({ overlayId: ({ event }) => event.id, overlayIdB: null }) },
            OPEN_VS:       { target: 'vs',     actions: assign({ overlayId: ({ event }) => event.a,  overlayIdB: ({ event }) => event.b }) },
            URL_CHANGED: [
              { guard: 'noOverlayUrl', target: 'closed', actions: assign({ overlayId: null, overlayIdB: null }) },
              { guard: 'isPersonUrl',  target: 'person', actions: assign({ overlayId: ({ event }) => getSearch(event)?.id  ?? null, overlayIdB: null }) },
              { guard: 'isVsUrl',      target: 'vs',     actions: assign({ overlayId: ({ event }) => getSearch(event)?.a   ?? null, overlayIdB: ({ event }) => getSearch(event)?.b ?? null }) },
            ],
          },
        },
        vs: {
          on: {
            CLOSE_OVERLAY: { target: 'closed',  actions: assign({ overlayId: null, overlayIdB: null }) },
            OPEN_PERSON:   { target: 'person',  actions: assign({ overlayId: ({ event }) => event.id, overlayIdB: null }) },
            OPEN_COMPANY:  { target: 'company', actions: assign({ overlayId: ({ event }) => event.id, overlayIdB: null }) },
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
