#!/bin/bash
# Fix Pattern E — ENGINE.READY fires before onEvent registered
# Root cause: async init() emits synchronously via microtask before
# createBridgeAndSubscribe assign() completes and calls bridge.onEvent()
#
# Fix: use a two-phase approach in engineManager
# Phase 1 (assign): create bridge, store in context — do NOT subscribe yet  
# Phase 2 (entry action on initializing state): subscribe to bridge events
# This guarantees subscription happens AFTER assign completes

set -e

cat > src/engine/engineManager.machine.ts << 'EOF'
// src/engine/engineManager.machine.ts
import { setup, assign, sendParent, enqueueActions } from 'xstate';
import type { EngineId, EngineInitInput }             from './contracts/inputs';
import type { IEngineBridge, BridgeEvent, Unsubscribe } from './contracts/bridge';
import { createEngine }                               from './engineFactory';

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
    // Phase 1: create bridge only — no subscription yet
    createBridge: assign(({ event }) => {
      const e = event as Extract<EngineManagerEvent, { type: 'ENGINE.REQUEST' | 'ENGINE.SWAP' }>;
      const bridge = createEngine(e.engineId, e.input);
      return { bridge, engineId: e.engineId, container: e.input.container };
    }),

    // Phase 2: subscribe to bridge — runs as entry action AFTER assign completes
    // By the time this runs, the bridge context is set and self.send is safe
    subscribeBridge: enqueueActions(({ context, self, enqueue }) => {
      if (!context.bridge) return;
      const unsubscribe = context.bridge.onEvent((bridgeEvent) => {
        self.send({ type: '_BRIDGE.EVENT', event: bridgeEvent });
      });
      enqueue.assign({ unsubscribe: () => unsubscribe });
    }),

    moveCurrentToPrevious: assign({
      previousBridge:      ({ context }) => context.bridge,
      previousUnsubscribe: ({ context }) => context.unsubscribe,
      bridge:              () => null,
      unsubscribe:         () => null,
    }),
    suspendPreviousBridge: ({ context }) => { context.previousBridge?.send({ type: 'CMD.SUSPEND' }); },
    disposePreviousBridge: ({ context }) => {
      context.previousUnsubscribe?.(); context.previousBridge?.send({ type: 'CMD.DISPOSE' });
    },
    clearPrevious: assign({ previousBridge: () => null, previousUnsubscribe: () => null }),
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
      context.unsubscribe?.(); context.bridge?.send({ type: 'CMD.DISPOSE' });
    },
    clearBridge: assign({
      bridge: () => null, unsubscribe: () => null,
      engineId: () => null, container: () => null, error: () => null,
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
  },
  states: {
    idle: {
      on: {
        'ENGINE.REQUEST': {
          target:  'initializing',
          actions: ['createBridge'],
        },
      },
    },

    initializing: {
      // subscribeBridge runs on entry — AFTER createBridge assign has settled
      // This guarantees handler is registered before ENGINE.READY fires
      entry: ['subscribeBridge'],
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
        '_BRIDGE.EVENT': { guard: 'isEntityClick', actions: 'forwardEntityClick' },
        'ENGINE.SWAP': {
          target:  'active.crossfading',
          actions: ['moveCurrentToPrevious', 'suspendPreviousBridge', 'createBridge'],
        },
        'ENGINE.DISPOSE': { target: 'idle', actions: ['disposeBridge', 'clearBridge'] },
      },
      states: {
        idle: {},
        crossfading: {
          initial: 'waiting',
          entry:   ['subscribeBridge'],
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
        'ENGINE.REQUEST': {
          target:  'initializing',
          actions: ['clearBridge', 'createBridge'],
        },
      },
    },
  },
});
EOF

echo "✅ Pattern E fix applied"
echo "engineManager now: createBridge (assign) → entry subscribeBridge → ENGINE.READY received"
echo "Reload browser — globe should appear"
