/**
 * graphInteractionMachine — reusable graph interaction controller.
 *
 * Used by: PersonOverlay ego network, CompanyOverlay graph, full D1 graph page.
 * Configured via input.instanceId so multiple instances coexist.
 *
 * Two parallel regions:
 *   focus:     idle ↔ hoveringNode ↔ nodeFocused → edgeSelected → traversing
 *   animation: calm ↔ interaction  (pauses decorative animations during active use)
 */

import { setup, assign } from 'xstate'

interface GraphInteractionContext {
  instanceId:      string
  hoveredNodeId:   string | null
  focusedNodeId:   string | null
  selectedEdgeId:  string | null
}

type GraphInteractionEvent =
  | { type: 'NODE.HOVER';       nodeId: string }
  | { type: 'NODE.UNHOVER' }
  | { type: 'NODE.FOCUS';       nodeId: string }
  | { type: 'NODE.BLUR' }
  | { type: 'EDGE.SELECT';      edgeId: string }
  | { type: 'EDGE.DESELECT' }
  | { type: 'TRAVERSE.START';   fromNodeId: string }
  | { type: 'TRAVERSE.COMPLETE' }
  | { type: '_CALM_TIMEOUT' }   // internal — fires after 2s of no interaction

export const graphInteractionMachine = setup({
  types: {
    context: {} as GraphInteractionContext,
    events:  {} as GraphInteractionEvent,
    input:   {} as { instanceId: string },
  },
  actions: {
    setHovered:  assign({ hoveredNodeId:  ({ event }) => (event as { nodeId: string }).nodeId }),
    clearHovered: assign({ hoveredNodeId: null }),
    setFocused:  assign({ focusedNodeId:  ({ event }) => (event as { nodeId: string }).nodeId }),
    clearFocused: assign({ focusedNodeId: null }),
    setEdge:     assign({ selectedEdgeId: ({ event }) => (event as { edgeId: string }).edgeId }),
    clearEdge:   assign({ selectedEdgeId: null }),
  },
}).createMachine({
  id: 'graph-interaction',
  type: 'parallel',
  context: ({ input }) => ({
    instanceId:     input.instanceId,
    hoveredNodeId:  null,
    focusedNodeId:  null,
    selectedEdgeId: null,
  }),
  states: {

    // ── Focus region ──────────────────────────────────────────────────────────
    focus: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'NODE.HOVER': { target: 'hoveringNode', actions: 'setHovered' },
            'NODE.FOCUS': { target: 'nodeFocused',  actions: 'setFocused' },
          },
        },
        hoveringNode: {
          on: {
            'NODE.UNHOVER': { target: 'idle',        actions: 'clearHovered' },
            'NODE.FOCUS':   { target: 'nodeFocused', actions: 'setFocused' },
          },
        },
        nodeFocused: {
          on: {
            'NODE.BLUR':    { target: 'idle',         actions: ['clearFocused', 'clearHovered'] },
            'EDGE.SELECT':  { target: 'edgeSelected', actions: 'setEdge' },
            'TRAVERSE.START': 'traversing',
          },
        },
        edgeSelected: {
          on: {
            'EDGE.DESELECT': { target: 'nodeFocused', actions: 'clearEdge' },
            'NODE.BLUR':     { target: 'idle',        actions: ['clearFocused', 'clearEdge'] },
          },
        },
        traversing: {
          on: {
            'TRAVERSE.COMPLETE': { target: 'idle', actions: ['clearFocused', 'clearHovered'] },
          },
        },
      },
    },

    // ── Animation region ──────────────────────────────────────────────────────
    // calm  → decorative animations run (pulse dots, breathing glow)
    // interaction → paused to reduce visual noise while user is active
    animation: {
      initial: 'calm',
      states: {
        calm: {
          on: {
            'NODE.HOVER':  'interaction',
            'NODE.FOCUS':  'interaction',
            'EDGE.SELECT': 'interaction',
          },
        },
        interaction: {
          after: {
            2000: 'calm',   // return to calm after 2s of inactivity
          },
          on: {
            'NODE.HOVER':       { target: 'interaction', reenter: true }, // reset timer
            'NODE.FOCUS':       { target: 'interaction', reenter: true },
            'EDGE.SELECT':      { target: 'interaction', reenter: true },
            'NODE.UNHOVER':     'calm',
            'NODE.BLUR':        'calm',
            'EDGE.DESELECT':    'calm',
            'TRAVERSE.COMPLETE': 'calm',
          },
        },
      },
    },
  },
})
