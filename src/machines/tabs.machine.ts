/**
 * tabsMachine — generic tab controller.
 *
 * Input:   { initialTab: string; tabs: string[] }
 * Context: { activeTab: string; availableTabs: string[] }
 * Event:   TAB.SET — assigns activeTab if tab is in availableTabs
 */

import { setup, assign } from 'xstate'

interface TabsContext {
  activeTab: string
  availableTabs: string[]
}

type TabsEvent = { type: 'TAB.SET'; tab: string }

export const tabsMachine = setup({
  types: {
    context: {} as TabsContext,
    events:  {} as TabsEvent,
    input:   {} as { initialTab: string; tabs: string[] },
  },
  guards: {
    isValidTab: ({ context, event }) =>
      context.availableTabs.includes((event as TabsEvent).tab),
  },
  actions: {
    setTab: assign({
      activeTab: ({ event }) => (event as TabsEvent).tab,
    }),
  },
}).createMachine({
  id: 'tabs',
  initial: 'active',
  context: ({ input }) => ({
    activeTab:     input.initialTab,
    availableTabs: input.tabs,
  }),
  states: {
    active: {
      on: {
        'TAB.SET': {
          guard:   'isValidTab',
          actions: 'setTab',
        },
      },
    },
  },
})
