// src/engine/engineManager.machine.ts
//
// STATE DIAGRAM
// =============
//
//  idle ──ENGINE.REQUEST──► initializing
//                               │
//                         bridge created + subscribed (createBridgeAndSubscribe)
//                               │
//               ENGINE.READY ◄──┤──► ENGINE.ERROR
//                   │                     │
//                   ▼                     ▼
//                active               failed ──ENGINE.REQUEST──► initializing
//                   │
//         ┌─────────┴──────────────────────────────┐
//         │  active.idle                           │
//         │  active.crossfading                    │
//         │    ├── crossfading.waiting             │
//         │    └── crossfading.settling (400ms)    │
//         └────────────────────────────────────────┘
//
// CROSSFADE:
//   ENGINE.SWAP → moveCurrentToPrevious → suspendPreviousBridge → createBridgeAndSubscribe
//   New bridge fires ENGINE.READY → settling (400ms) → disposePreviousBridge → idle
//   New bridge fires ENGINE.ERROR → rollbackSwap → active.idle (old engine still live)
//
// SUBSCRIPTION:
//   Single point: createBridgeAndSubscribe. Unsubscribe stored in context.
//   disposeBridge calls context.unsubscribe?.() before CMD.DISPOSE.

import { setup, assign, sendParent }                        from 'xstate';
import type { EngineId, EngineInitInput }                   from './contracts/inputs';
import type { IEngineBridge, BridgeEvent, Unsubscribe }     from './contracts/bridge';
import { createEngine }                                     from './engineFactory';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EngineManagerContext {
  engineId:            EngineId | null;
  bridge:              IEngineBridge | null;
  unsubscribe:         Unsubscribe | null;
  previousBridge:      IEngineBridge | null;
  previousUnsubscribe: Unsubscribe | null;
  container:           HTMLDivElement | null;
  error:               Error | null;
}

type EngineManagerEvent =
  | { type: 'ENGINE.REQUEST'; engineId: EngineId; input: EngineInitInput }
  | { type: 'ENGINE.SWAP';    engineId: EngineId; input: EngineInitInput }
  | { type: 'ENGINE.DISPOSE' }
  | { type: '_BRIDGE.EVENT';  event: BridgeEvent };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBridgeReady(event: EngineManagerEvent): boolean {
  return event.type === '_BRIDGE.EVENT' && event.event.type === 'ENGINE.READY';
}

function isBridgeError(event: EngineManagerEvent): boolean {
  return event.type === '_BRIDGE.EVENT' && event.event.type === 'ENGINE.ERROR';
}

function isEntityClick(event: EngineManagerEvent): boolean {
  return event.type === '_BRIDGE.EVENT' && event.event.type === 'ENGINE.ENTITY_CLICK';
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const engineManagerMachine = setup({
  types: {
    context: {} as EngineManagerContext,
    events:  {} as EngineManagerEvent,
  },

  actions: {
    // Single subscription point — no other call to bridge.onEvent() exists in this file
    createBridgeAndSubscribe: assign(({ event, self }) => {
      const e = event as Extract<EngineManagerEvent, { type: 'ENGINE.REQUEST' | 'ENGINE.SWAP' }>;
      const bridge = createEngine(e.engineId, e.input);
      const unsubscribe = bridge.onEvent((bridgeEvent) =>
        self.send({ type: '_BRIDGE.EVENT', event: bridgeEvent })
      );
      return {
        bridge,
        unsubscribe,
        engineId:  e.engineId,
        container: e.input.container,
      };
    }),

    moveCurrentToPrevious: assign({
      previousBridge:      ({ context }) => context.bridge,
      previousUnsubscribe: ({ context }) => context.unsubscribe,
      bridge:              () => null,
      unsubscribe:         () => null,
    }),

    suspendPreviousBridge: ({ context }) => {
      context.previousBridge?.send({ type: 'CMD.SUSPEND' });
    },

    disposePreviousBridge: ({ context }) => {
      context.previousUnsubscribe?.();
      context.previousBridge?.send({ type: 'CMD.DISPOSE' });
    },

    clearPrevious: assign({
      previousBridge:      () => null,
      previousUnsubscribe: () => null,
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

    resumeCurrentBridge: ({ context }) => {
      context.bridge?.send({ type: 'CMD.RESUME' });
    },

    disposeBridge: ({ context }) => {
      context.unsubscribe?.();
      context.bridge?.send({ type: 'CMD.DISPOSE' });
    },

    clearBridge: assign({
      bridge:      () => null,
      unsubscribe: () => null,
      engineId:    () => null,
      container:   () => null,
      error:       () => null,
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
    engineId:            null,
    bridge:              null,
    unsubscribe:         null,
    previousBridge:      null,
    previousUnsubscribe: null,
    container:           null,
    error:               null,
  },

  states: {
    idle: {
      on: {
        'ENGINE.REQUEST': {
          target:  'initializing',
          actions: ['createBridgeAndSubscribe'],
        },
      },
    },

    initializing: {
      on: {
        '_BRIDGE.EVENT': [
          { guard: 'isBridgeReady', target: 'active' },
          { guard: 'isBridgeError', target: 'failed', actions: ['assignError', 'escalateError'] },
        ],
      },
    },

    active: {
      initial: 'idle',
      on: {
        '_BRIDGE.EVENT': {
          guard:   'isEntityClick',
          actions: 'forwardEntityClick',
        },
        'ENGINE.SWAP': {
          target:  'active.crossfading',
          actions: ['moveCurrentToPrevious', 'suspendPreviousBridge', 'createBridgeAndSubscribe'],
        },
        'ENGINE.DISPOSE': {
          target:  'idle',
          actions: ['disposeBridge', 'clearBridge'],
        },
      },
      states: {
        idle: {},
        crossfading: {
          initial: 'waiting',
          states: {
            waiting: {
              on: {
                '_BRIDGE.EVENT': [
                  { guard: 'isBridgeReady', target: 'settling' },
                  {
                    guard:   'isBridgeError',
                    target:  '#engineManager.active.idle',
                    actions: ['rollbackSwap', 'resumeCurrentBridge'],
                  },
                ],
              },
            },
            settling: {
              after: {
                400: {
                  target:  '#engineManager.active.idle',
                  actions: ['disposePreviousBridge', 'clearPrevious'],
                },
              },
            },
          },
        },
      },
    },

    failed: {
      on: {
        'ENGINE.REQUEST': {
          target:  'initializing',
          actions: ['clearBridge', 'createBridgeAndSubscribe'],
        },
      },
    },
  },
});
