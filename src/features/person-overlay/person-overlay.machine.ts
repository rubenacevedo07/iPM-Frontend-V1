import { setup, type ActorRefFrom } from 'xstate'
import { entityInspectorMachine } from '@/machines/entity-inspector.machine'
import { graphInteractionMachine } from '@/machines/graph-interaction.machine'
import { tabsMachine } from '@/machines/tabs.machine'
import type { EntityRef } from '@/domain/types'

type PersonOverlayContext = {
  entity: EntityRef
  inspectorRef: ActorRefFrom<typeof entityInspectorMachine> | null
  graphRef: ActorRefFrom<typeof graphInteractionMachine> | null
  tabsRef: ActorRefFrom<typeof tabsMachine> | null
}

export const personOverlayMachine = setup({
  types: {
    context: {} as PersonOverlayContext,
    input: {} as { entity: EntityRef },
    events: {} as
      | { type: 'CLOSE' }
      | { type: 'RELATION.OPEN'; target: EntityRef }
      | { type: 'RELATION.CLOSE' },
  },
  actors: {
    entityInspectorMachine,
    graphInteractionMachine,
    tabsMachine,
  },
}).createMachine({
  id: 'personOverlay',
  initial: 'active',
  context: ({ input, spawn }) => ({
    entity: input.entity,
    inspectorRef: spawn('entityInspectorMachine', { id: 'inspector' }),
    graphRef: spawn('graphInteractionMachine', {
      id: 'graph',
      input: { instanceId: `ego-${input.entity.nodeId}` },
    }),
    tabsRef: spawn('tabsMachine', {
      id: 'tabs',
      input: { initialTab: 'overview', tabs: ['overview', 'trader', 'analyst', 'predictions'] },
    }),
  }),
  states: {
    active: {
      entry: ({ context }) => {
        context.inspectorRef?.send({
          type: 'ENTITY.OPEN',
          entity: context.entity,
        })
      },
      on: {
        'CLOSE': 'done',
        'RELATION.OPEN': {
          actions: ({ context, event }) => {
            context.inspectorRef?.send({
              type: 'RELATION.OPEN',
              target: event.target,
            })
          },
        },
        'RELATION.CLOSE': {
          actions: ({ context }) => {
            context.inspectorRef?.send({ type: 'RELATION.CLOSE' })
          },
        },
      },
    },
    done: { type: 'final' },
  },
})
