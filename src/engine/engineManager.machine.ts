// src/engine/engineManager.machine.ts — RESTORED from unauthorized split
// Single createBridgeAndSubscribe action (as designed in Phase 2b)

import { setup, assign, sendParent }                        from 'xstate';
import type { EngineId, EngineInitInput, EngineEntityData, EngineArcData, GraphEngineData, EngineCompanySelectionData } from './contracts/inputs';
import type { IEngineBridge, BridgeEvent, Unsubscribe }     from './contracts/bridge';
import { createEngine }                                     from './engineFactory';

interface EngineManagerContext {
  engineId:            EngineId | null;
  bridge:              IEngineBridge | null;
  unsubscribe:         Unsubscribe | null;
  previousBridge:      IEngineBridge | null;
  previousUnsubscribe: Unsubscribe | null;
  container:           HTMLDivElement | null;
  error:               Error | null;
  /** Which DOM slot currently holds the active (fully visible) engine. Toggles on each successful crossfade. */
  activeSlot:          'a' | 'b';
}

type EngineManagerEvent =
  | { type: 'ENGINE.REQUEST';   engineId: EngineId; input: EngineInitInput }
  | { type: 'ENGINE.SWAP';      engineId: EngineId; input: EngineInitInput }
  | { type: 'ENGINE.DISPOSE' }
  | { type: '_BRIDGE.EVENT';    event: BridgeEvent }
  | { type: 'CMD.SET_ENTITIES';           data: EngineEntityData }
  | { type: 'CMD.SET_ARCS';                data: EngineArcData }
  | { type: 'CMD.SET_GRAPH';              data: GraphEngineData }
  | { type: 'CMD.SET_COMPANY_SELECTION';  data: EngineCompanySelectionData }
  | { type: 'CMD.SET_POWERMAP';            powermapId: string | null }
  | { type: 'CMD.FLY_TO'; longitude: number; latitude: number; zoom?: number; duration?: number }
  | { type: 'CMD.SET_ROTATION'; enabled: boolean }
  | { type: 'CMD.SET_FOCUS'; target: import('@/app/app.events').EntityRef | null };

function isBridgeReady(event: EngineManagerEvent): boolean {
  return event.type === '_BRIDGE.EVENT' && event.event.type === 'ENGINE.READY';
}
function isBridgeError(event: EngineManagerEvent): boolean {
  return event.type === '_BRIDGE.EVENT' && event.event.type === 'ENGINE.ERROR';
}
function isEntityClick(event: EngineManagerEvent): boolean {
  return event.type === '_BRIDGE.EVENT' && event.event.type === 'ENGINE.ENTITY_CLICK';
}

export const engineManagerMachine = setup({
  types: { context: {} as EngineManagerContext, events: {} as EngineManagerEvent },
  actions: {
    // SINGLE action — create bridge AND subscribe atomically
    // Subscription registered BEFORE init() emits ENGINE.READY because
    // init() is async (void this.init) and onEvent is synchronous
    createBridgeAndSubscribe: assign(({ event, self }) => {
      const e = event as Extract<EngineManagerEvent, { type: 'ENGINE.REQUEST' | 'ENGINE.SWAP' }>;
      const bridge = createEngine(e.engineId, e.input);
      const unsubscribe = bridge.onEvent((bridgeEvent) => {
        self.send({ type: '_BRIDGE.EVENT', event: bridgeEvent });
      });
      return { bridge, unsubscribe, engineId: e.engineId, container: e.input.container };
    }),

    moveCurrentToPrevious: assign({
      previousBridge:      ({ context }) => context.bridge,
      previousUnsubscribe: ({ context }) => context.unsubscribe,
      bridge:              () => null,
      unsubscribe:         () => null,
    }),
    suspendPreviousBridge: ({ context }) => { context.previousBridge?.send({ type: 'CMD.SUSPEND' }); },
    disposePreviousBridge: ({ context }) => {
      context.previousUnsubscribe?.();
      context.previousBridge?.send({ type: 'CMD.DISPOSE' });
    },
    clearPrevious: assign({
      previousBridge:      () => null,
      previousUnsubscribe: () => null,
      // Flip the active slot — the incoming engine just became the visible one.
      activeSlot: ({ context }) => context.activeSlot === 'b' ? 'a' : 'b',
    }),
    rollbackSwap: assign({
      bridge:              ({ context }) => context.previousBridge,
      unsubscribe:         ({ context }) => context.previousUnsubscribe,
      previousBridge:      () => null,
      previousUnsubscribe: () => null,
      error: ({ event }) => {
        const e = event as Extract<EngineManagerEvent, { type: '_BRIDGE.EVENT' }>;
        return e.event.type === 'ENGINE.ERROR' ? e.event.error : null;
      },
    }),
    resumeCurrentBridge: ({ context }) => { context.bridge?.send({ type: 'CMD.RESUME' }); },
    disposeBridge: ({ context }) => {
      context.unsubscribe?.();
      context.bridge?.send({ type: 'CMD.DISPOSE' });
    },
    clearBridge: assign({
      bridge: () => null, unsubscribe: () => null,
      engineId: () => null, container: () => null, error: () => null,
      previousBridge: () => null, previousUnsubscribe: () => null,
    }),
    assignError: assign({
      error: ({ event }) => {
        const e = event as Extract<EngineManagerEvent, { type: '_BRIDGE.EVENT' }>;
        return e.event.type === 'ENGINE.ERROR' ? e.event.error : null;
      },
    }),
    forwardEntityClick: sendParent(({ event }) => {
      const e  = event as Extract<EngineManagerEvent, { type: '_BRIDGE.EVENT' }>;
      const ev = e.event as Extract<BridgeEvent, { type: 'ENGINE.ENTITY_CLICK' }>;
      return { type: 'ATLAS.ENTITY_CLICK', entity: ev.entity } as const;
    }),
    escalateError: sendParent(({ context, event }) => {
      const e  = event as Extract<EngineManagerEvent, { type: '_BRIDGE.EVENT' }>;
      const ev = e.event as Extract<BridgeEvent, { type: 'ENGINE.ERROR' }>;
      return { type: 'ATLAS.ENGINE_FAILED', engineId: context.engineId, error: ev.error } as const;
    }),
  },
  guards: {
    isBridgeReady: ({ event }) => isBridgeReady(event),
    isBridgeError: ({ event }) => isBridgeError(event),
    isEntityClick: ({ event }) => isEntityClick(event),
  },
}).createMachine({
  id: 'engineManager',
  initial: 'idle',
  context: {
    engineId: null, bridge: null, unsubscribe: null,
    previousBridge: null, previousUnsubscribe: null,
    container: null, error: null,
    activeSlot: 'b' as const,  // initial ENGINE.REQUEST always uses slotB
  },
  states: {
    idle: {
      on: {
        'ENGINE.REQUEST':  { target: 'initializing', actions: ['createBridgeAndSubscribe'] },
        // Phase 9: tab close / full navigation — parent may send DISPOSE from any
        // state; in idle, bridge is already null — dispose is a cheap no-op.
        'ENGINE.DISPOSE':  { target: 'idle', actions: ['disposeBridge', 'clearBridge'] },
      },
    },
    initializing: {
      on: {
        '_BRIDGE.EVENT': [
          { guard: 'isBridgeReady', target: 'active' },
          { guard: 'isBridgeError', target: 'failed', actions: ['assignError', 'escalateError'] },
        ],
        // User closed the tab while init() in flight — release WebGL + subscription.
        'ENGINE.DISPOSE': { target: 'idle', actions: ['disposeBridge', 'clearBridge'] },
      },
    },
    active: {
      initial: 'idle',
      on: {
        '_BRIDGE.EVENT': { guard: 'isEntityClick', actions: 'forwardEntityClick' },
        'ENGINE.SWAP': {
          target: 'active.crossfading',
          // disposePreviousBridge first: if a swap arrives during crossfading the old
          // previousBridge would be overwritten and leaked. Dispose it before moving current.
          actions: ['disposePreviousBridge', 'moveCurrentToPrevious', 'suspendPreviousBridge', 'createBridgeAndSubscribe'],
        },
        'ENGINE.DISPOSE': { target: 'idle', actions: ['disposePreviousBridge', 'disposeBridge', 'clearBridge'] },
      },
      states: {
        idle: {
          on: {
            'CMD.SET_ENTITIES': {
              actions: ({ context, event }) => {
                context.bridge?.send({ type: 'CMD.SET_ENTITIES', data: event.data });
              },
            },
            'CMD.SET_ARCS': {
              actions: ({ context, event }) => {
                context.bridge?.send({ type: 'CMD.SET_ARCS', data: event.data });
              },
            },
            'CMD.SET_GRAPH': {
              actions: ({ context, event }) => {
                context.bridge?.send({ type: 'CMD.SET_GRAPH', data: event.data });
              },
            },
            'CMD.SET_COMPANY_SELECTION': {
              actions: ({ context, event }) => {
                context.bridge?.send({ type: 'CMD.SET_COMPANY_SELECTION', data: event.data });
              },
            },
            'CMD.SET_POWERMAP': {
              actions: ({ context, event }) => {
                context.bridge?.send({ type: 'CMD.SET_POWERMAP', powermapId: event.powermapId });
              },
            },
            'CMD.FLY_TO': {
              actions: ({ context, event }) => {
                context.bridge?.send({
                  type: 'CMD.FLY_TO',
                  longitude: event.longitude,
                  latitude:  event.latitude,
                  zoom:      event.zoom,
                  duration:  event.duration,
                });
              },
            },
            'CMD.SET_ROTATION': {
              actions: ({ context, event }) => {
                context.bridge?.send({ type: 'CMD.SET_ROTATION', enabled: event.enabled });
              },
            },
            'CMD.SET_FOCUS': {
              actions: ({ context, event }) => {
                context.bridge?.send({ type: 'CMD.SET_FOCUS', target: event.target });
              },
            },
          },
        },
        crossfading: {
          initial: 'waiting',
          states: {
            waiting: {
              on: {
                '_BRIDGE.EVENT': [
                  { guard: 'isBridgeReady', target: 'settling' },
                  { guard: 'isBridgeError', target: '#engineManager.active.idle',
                    actions: ['rollbackSwap', 'resumeCurrentBridge'] },
                ],
              },
            },
            settling: {
              after: { 400: { target: '#engineManager.active.idle',
                actions: ['disposePreviousBridge', 'clearPrevious'] } },
            },
          },
        },
      },
    },
    failed: {
      on: {
        'ENGINE.REQUEST':  { target: 'initializing', actions: ['clearBridge', 'createBridgeAndSubscribe'] },
        'ENGINE.DISPOSE':  { target: 'idle', actions: ['disposeBridge', 'clearBridge'] },
      },
    },
  },
});
