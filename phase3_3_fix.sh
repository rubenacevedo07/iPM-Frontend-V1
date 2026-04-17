#!/bin/bash
# Phase 3.3 FIX — restore createBridgeAndSubscribe (Sonnet did unauthorized refactor)
# Keeps [DIAG] logs active for verification after fix
set -e

echo "Restoring engineManager.machine.ts with single createBridgeAndSubscribe action..."

cat > src/engine/engineManager.machine.ts << 'EOF'
// src/engine/engineManager.machine.ts — RESTORED from unauthorized split
// Single createBridgeAndSubscribe action (as designed in Phase 2b)
// [DIAG] logs kept for verification — remove after globe renders

import { setup, assign, sendParent }                        from 'xstate';
import type { EngineId, EngineInitInput }                   from './contracts/inputs';
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
    // SINGLE action — create bridge AND subscribe atomically
    // Subscription registered BEFORE init() emits ENGINE.READY because
    // init() is async (void this.init) and onEvent is synchronous
    createBridgeAndSubscribe: assign(({ event, self }) => {
      console.log('[DIAG] createBridgeAndSubscribe called, event:', event.type);
      const e = event as Extract<EngineManagerEvent, { type: 'ENGINE.REQUEST' | 'ENGINE.SWAP' }>;
      console.log('[DIAG] creating engine:', e.engineId);
      const bridge = createEngine(e.engineId, e.input);
      console.log('[DIAG] bridge created, registering subscription');
      const unsubscribe = bridge.onEvent((bridgeEvent) => {
        console.log('[DIAG] bridge event received in manager:', bridgeEvent.type);
        self.send({ type: '_BRIDGE.EVENT', event: bridgeEvent });
      });
      console.log('[DIAG] subscription active, handlers registered');
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
      context.unsubscribe?.();
      context.bridge?.send({ type: 'CMD.DISPOSE' });
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
      on: { 'ENGINE.REQUEST': { target: 'initializing', actions: ['createBridgeAndSubscribe'] } },
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
        '_BRIDGE.EVENT': { guard: 'isEntityClick', actions: 'forwardEntityClick' },
        'ENGINE.SWAP': {
          target: 'active.crossfading',
          actions: ['moveCurrentToPrevious', 'suspendPreviousBridge', 'createBridgeAndSubscribe'],
        },
        'ENGINE.DISPOSE': { target: 'idle', actions: ['disposeBridge', 'clearBridge'] },
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
      on: { 'ENGINE.REQUEST': { target: 'initializing', actions: ['clearBridge', 'createBridgeAndSubscribe'] } },
    },
  },
});
EOF

echo "✅ engineManager.machine.ts restored with createBridgeAndSubscribe + [DIAG] logs"
echo ""
echo "Next steps:"
echo "  1. Clear Vite cache:  rm -rf node_modules/.vite"
echo "  2. Restart dev server: npm run dev"
echo "  3. Hard reload browser: Ctrl+Shift+R"
echo "  4. Check console — should see:"
echo "     [DIAG] createBridgeAndSubscribe called"
echo "     [DIAG] bridge event received in manager: ENGINE.READY"
echo "     [DIAG] engineManager state: {\"active\":\"idle\"}"
echo "     ← globe should appear rotating"
