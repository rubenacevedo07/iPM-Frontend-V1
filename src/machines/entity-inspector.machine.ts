/**
 * entityInspectorMachine — core overlay / inspector behavior.
 *
 * Reused by PersonOverlay, CompanyOverlay, CountryOverlay — same state machine,
 * different React components consuming it.
 *
 * Flow:
 *   closed ──ENTITY.OPEN──▶ cinematic ──CINEMATIC.COMPLETE──▶ solo
 *                                                              │
 *                                                      RELATION.OPEN
 *                                                              │
 *                                                              ▼
 *                                                          cinematic ──CINEMATIC.COMPLETE──▶ relation
 *                                                                                               │
 *                                                                                       RELATION.CLOSE
 *                                                                                               │
 *                                                                                               ▼
 *                                                                                             solo
 *
 *   Any state ──ENTITY.CLOSE──▶ closing ──(200ms)──▶ closed
 */

import { setup, assign } from 'xstate'
import type { EntityRef, TransitionScene } from '@/domain/types'
import { getScene } from '@/components/overlays/sceneMap'

interface InspectorContext {
  entity:             EntityRef | null
  transitionScene:    TransitionScene | null
  transitionSubLabel: string | null
  transitionTarget:   'solo' | 'relation'
  relationTarget:     EntityRef | null
}

type InspectorEvent =
  | { type: 'ENTITY.OPEN';        entity: EntityRef }
  | { type: 'ENTITY.CLOSE' }
  | { type: 'CINEMATIC.COMPLETE' }
  | { type: 'RELATION.OPEN';      target: EntityRef; subLabel?: string }
  | { type: 'RELATION.CLOSE' }

export const entityInspectorMachine = setup({
  types: {
    context: {} as InspectorContext,
    events:  {} as InspectorEvent,
  },
  actions: {
    // Set context when opening overlay for an entity
    openEntity: assign({
      entity:             ({ event }) => (event as { type: 'ENTITY.OPEN'; entity: EntityRef }).entity,
      transitionScene:    ({ event }) => {
        const e = (event as { type: 'ENTITY.OPEN'; entity: EntityRef }).entity
        return getScene(e.nodeId, e.name)
      },
      transitionSubLabel: null,
      transitionTarget:   'solo' as const,
      relationTarget:     null,
    }),
    // Prepare cinematic for relation mode
    openRelation: assign({
      relationTarget:     ({ event }) => (event as { type: 'RELATION.OPEN'; target: EntityRef }).target,
      transitionScene:    ({ event }) => {
        const e = (event as { type: 'RELATION.OPEN'; target: EntityRef; subLabel?: string })
        return getScene(e.target.nodeId, e.target.name)
      },
      transitionSubLabel: ({ event }) => {
        const e = (event as { type: 'RELATION.OPEN'; target: EntityRef; subLabel?: string })
        return e.subLabel ?? `Studio Relation · ${e.target.name}`
      },
      transitionTarget:   'relation' as const,
    }),
    // Reset relation state when going back to solo
    clearRelation: assign({
      relationTarget:     null,
      transitionSubLabel: null,
    }),
  },
}).createMachine({
  id: 'entity-inspector',
  initial: 'closed',
  context: {
    entity:             null,
    transitionScene:    null,
    transitionSubLabel: null,
    transitionTarget:   'solo',
    relationTarget:     null,
  },
  states: {
    closed: {
      on: {
        'ENTITY.OPEN': { target: 'cinematic', actions: 'openEntity' },
      },
    },

    cinematic: {
      on: {
        'CINEMATIC.COMPLETE': [
          { guard: ({ context }) => context.transitionTarget === 'relation', target: 'relation' },
          { target: 'solo' },
        ],
        'ENTITY.CLOSE': 'closing',
      },
    },

    solo: {
      on: {
        'RELATION.OPEN': { target: 'cinematic', actions: 'openRelation' },
        'ENTITY.CLOSE':  'closing',
      },
    },

    relation: {
      on: {
        'RELATION.CLOSE': { target: 'solo', actions: 'clearRelation' },
        'ENTITY.CLOSE':   'closing',
      },
    },

    // Brief closing state — lets React play exit animations before unmount
    closing: {
      after: { 200: 'closed' },
    },
  },
})
