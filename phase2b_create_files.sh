#!/bin/bash
# Phase 2b — create all engine files from scratch
# Run from repo root: bash phase2b_create_files.sh

set -e

mkdir -p src/engine/contracts
mkdir -p src/components/EngineSlot

echo "Creating src/engine/contracts/inputs.ts..."
cat > src/engine/contracts/inputs.ts << 'EOF'
// src/engine/contracts/inputs.ts
// Pure engine input contracts — NO DTOs, NO wire format, NO API shapes (Rule 4)

import type { EntityRef, AtlasView } from '@/domain/types';

/** Canonical identifier for a registered engine implementation */
export type EngineId = 'globe' | 'network' | 'force';

/** Input passed to an engine on initialization */
export interface EngineInitInput {
  /** DOM container where the engine mounts its canvas/renderer */
  container: HTMLDivElement;
  /** Starting view mode */
  view: AtlasView;
  /** Optional: initial entity to focus on mount */
  focusTarget?: EntityRef;
}

/** Input for a live view update (no remount) */
export interface EngineViewInput {
  view: AtlasView;
}

/** Input for focusing an entity within the current engine */
export interface EngineFocusInput {
  target: EntityRef | null;
}

/** Input for a crossfade swap between two engine slots */
export interface EngineCrossfadeInput {
  /** The engine about to become visible */
  incomingId: EngineId;
  /** Duration in ms */
  durationMs: number;
}
EOF

echo "Creating src/engine/contracts/engine.ts..."
cat > src/engine/contracts/engine.ts << 'EOF'
// src/engine/contracts/engine.ts
// Engine capability contract — what every engine implementation must satisfy (Rule 4, Rule 5)

import type { AtlasView } from '@/domain/types';
import type { EngineInitInput, EngineViewInput, EngineFocusInput } from './inputs';

/**
 * Lifecycle state of a single engine instance.
 * Managed by EngineManager — engines do NOT self-report this.
 */
export type EngineLifecycle = 'uninitialized' | 'initializing' | 'ready' | 'disposed';

/**
 * Every engine implementation must satisfy this interface.
 * Engines own their render loop. No R3F, no reconciler (Rule 5).
 */
export interface IEngine {
  readonly id: string;

  /** Mount canvas into container and start render loop */
  init(input: EngineInitInput): Promise<void>;

  /** Live view update — no remount, no flicker */
  setView(input: EngineViewInput): void;

  /** Focus/defocus an entity — engine handles camera + highlight */
  setFocus(input: EngineFocusInput): void;

  /** Pause render loop (called when engine slot is hidden) */
  suspend(): void;

  /** Resume render loop (called when engine slot becomes visible) */
  resume(): void;

  /** Tear down render loop and release all GPU/DOM resources */
  dispose(): void;
}

/**
 * Static descriptor registered in engineFactory.
 * Factory uses this to construct engine instances on demand.
 */
export interface EngineDescriptor {
  id: string;
  /** Human-readable label for devtools */
  label: string;
  /** Supported AtlasView modes for this engine */
  supportedViews: AtlasView[];
  /** Factory function — returns a new uninitialized instance */
  create(): IEngine;
}
EOF

echo "Creating src/engine/contracts/bridge.ts..."
cat > src/engine/contracts/bridge.ts << 'EOF'
// src/engine/contracts/bridge.ts
// Bridge contract — communication channel between AtlasView and an engine instance (Rule 4)

import type { EntityRef, AtlasView } from '@/domain/types';
import type { EngineId } from './inputs';

/** Canonical unsubscribe handle — matches XState/nanostores/zustand convention */
export type Unsubscribe = () => void;

/**
 * Events the engine emits UP to EngineManager (which forwards via sendParent to app.machine).
 *
 * Guaranteed emission order per engine lifecycle:
 *   1. ENGINE.READY     — exactly once, unless ENGINE.ERROR fires instead
 *   2. ENGINE.ENTITY_CLICK / ENGINE.ENTITY_HOVER — zero or more, only after READY
 *   3. ENGINE.DISPOSED  — exactly once, terminal
 *
 * Implementors (GlobeBridge, future bridges) MUST buffer or drop any
 * interaction events that would fire before ENGINE.READY is emitted.
 */
export type BridgeEvent =
  | { type: 'ENGINE.READY'; engineId: EngineId }
  | { type: 'ENGINE.ERROR'; engineId: EngineId; error: Error }
  | { type: 'ENGINE.ENTITY_CLICK'; entity: EntityRef }
  | { type: 'ENGINE.ENTITY_HOVER'; entity: EntityRef | null }
  | { type: 'ENGINE.DISPOSED'; engineId: EngineId };

/**
 * Commands app.machine sends DOWN to an engine via EngineManager → bridge.
 * One-directional: machine → engine only.
 */
export type BridgeCommand =
  | { type: 'CMD.SET_VIEW'; view: AtlasView }
  | { type: 'CMD.SET_FOCUS'; target: EntityRef | null }
  | { type: 'CMD.SUSPEND' }
  | { type: 'CMD.RESUME' }
  | { type: 'CMD.DISPOSE' };

/**
 * Bridge instance attached to a single engine slot.
 * EngineManager holds one bridge per slot.
 *
 * `status` is a live getter — read it on each access, not once at construction.
 */
export interface IEngineBridge {
  readonly engineId: EngineId;

  /** Live status — reflects current engine lifecycle position */
  readonly status: 'pending' | 'ready' | 'disposed' | 'failed';

  /**
   * Send a command down to the engine.
   * Commands sent when status !== 'ready' are silently dropped by the implementation.
   */
  send(command: BridgeCommand): void;

  /** Register a listener for events coming up from the engine. Returns unsubscribe. */
  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe;
}

/** Registry entry — one per active engine slot, populated by bridgeRegistry */
export interface BridgeRegistryEntry {
  engineId: EngineId;
  bridge: IEngineBridge;
}
EOF

echo "Creating src/engine/engineFactory.ts..."
cat > src/engine/engineFactory.ts << 'EOF'
// src/engine/engineFactory.ts
// Sync factory — returns bridge in `pending`, async init runs behind ENGINE.READY (Rule 4, Rule 5)

import type { EngineId, EngineInitInput } from './contracts/inputs';
import type { IEngineBridge, BridgeEvent, BridgeCommand, Unsubscribe } from './contracts/bridge';

// ---------------------------------------------------------------------------
// Base bridge implementation — shared by all engine stubs
// ---------------------------------------------------------------------------

class BaseBridge implements IEngineBridge {
  readonly engineId: EngineId;
  private _status: IEngineBridge['status'] = 'pending';
  private _handlers: Array<(event: BridgeEvent) => void> = [];

  constructor(engineId: EngineId) {
    this.engineId = engineId;
  }

  get status(): IEngineBridge['status'] {
    return this._status;
  }

  /**
   * Send a command down to the engine.
   * Commands sent when status !== 'ready' are silently dropped.
   */
  send(_command: BridgeCommand): void {
    if (this._status !== 'ready') return;
    // Concrete bridge overrides this to forward to engine
  }

  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe {
    this._handlers.push(handler);
    return () => {
      this._handlers = this._handlers.filter(h => h !== handler);
    };
  }

  protected emit(event: BridgeEvent): void {
    this._handlers.forEach(h => h(event));
  }

  protected setStatus(next: IEngineBridge['status']): void {
    this._status = next;
  }
}

// ---------------------------------------------------------------------------
// Engine stubs
// ---------------------------------------------------------------------------

class GlobeBridge extends BaseBridge {
  constructor(input: EngineInitInput) {
    super('globe');
    this._init(input);
  }

  private async _init(input: EngineInitInput): Promise<void> {
    try {
      // TODO Phase 3: replace with real DeckGL imperative init (new Deck({...}), deck.setProps())
      await Promise.resolve();
      input.container.dataset.engine = 'globe';
      this.setStatus('ready');
      this.emit({ type: 'ENGINE.READY', engineId: 'globe' });
    } catch (error) {
      this.setStatus('failed');
      this.emit({ type: 'ENGINE.ERROR', engineId: 'globe', error: error as Error });
    }
  }
}

class NetworkBridge extends BaseBridge {
  constructor(input: EngineInitInput) {
    super('network');
    this._init(input);
  }

  private async _init(input: EngineInitInput): Promise<void> {
    try {
      // STUB: kept for EngineManager testing. Real impl in Phase 4+
      await Promise.resolve();
      input.container.dataset.engine = 'network';
      this.setStatus('ready');
      this.emit({ type: 'ENGINE.READY', engineId: 'network' });
    } catch (error) {
      this.setStatus('failed');
      this.emit({ type: 'ENGINE.ERROR', engineId: 'network', error: error as Error });
    }
  }
}

class ForceBridge extends BaseBridge {
  constructor(input: EngineInitInput) {
    super('force');
    this._init(input);
  }

  private async _init(input: EngineInitInput): Promise<void> {
    try {
      // STUB: kept for EngineManager testing. Real impl in Phase 4+
      await Promise.resolve();
      input.container.dataset.engine = 'force';
      this.setStatus('ready');
      this.emit({ type: 'ENGINE.READY', engineId: 'force' });
    } catch (error) {
      this.setStatus('failed');
      this.emit({ type: 'ENGINE.ERROR', engineId: 'force', error: error as Error });
    }
  }
}

// ---------------------------------------------------------------------------
// Registry + factory function
// ---------------------------------------------------------------------------

const engines: Record<EngineId, (input: EngineInitInput) => IEngineBridge> = {
  globe:   (input) => new GlobeBridge(input),
  network: (input) => new NetworkBridge(input),
  force:   (input) => new ForceBridge(input),
};

/**
 * Sync factory — returns bridge immediately in `pending` status.
 * Listen for ENGINE.READY before sending commands.
 */
export function createEngine(engineId: EngineId, input: EngineInitInput): IEngineBridge {
  const factory = engines[engineId];
  if (!factory) throw new Error(`Unknown engineId: ${engineId}`);
  return factory(input);
}
EOF

echo "Creating src/engine/engineManager.machine.ts..."
cat > src/engine/engineManager.machine.ts << 'EOF'
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
EOF

echo "Creating src/components/EngineSlot/EngineSlot.tsx..."
cat > src/components/EngineSlot/EngineSlot.tsx << 'EOF'
// src/components/EngineSlot/EngineSlot.tsx
//
// Pure view over EngineManager actor state.
// Opacity is written directly to the DOM — no React re-renders on state change.
//
// Slot mapping (fixed):
//   slot-a → previousBridge container (fades out during crossfade)
//   slot-b → currentBridge container  (fades in during crossfade)
//
// Parent responsibilities:
//   - Dispatch ENGINE.REQUEST with slotB ref as EngineInitInput.container
//   - Dispatch ENGINE.SWAP with slotA ref as previous, slotB as incoming
//   - EngineSlot does NOT dispatch any events — it is read-only over actor state

import { useEffect, useRef }         from 'react';
import type { ActorRefFrom }         from 'xstate';
import type { engineManagerMachine } from '@/engine/engineManager.machine';
import styles                        from './EngineSlot.module.scss';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineSlotRefs {
  slotA: HTMLDivElement;
  slotB: HTMLDivElement;
}

interface Props {
  actorRef:    ActorRefFrom<typeof engineManagerMachine>;
  onRefsReady: (refs: EngineSlotRefs) => void;
}

interface SlotOpacity { a: number; b: number }

// ---------------------------------------------------------------------------
// Opacity derivation — snapshot.matches() only, no string matching
// ---------------------------------------------------------------------------

function deriveOpacity(
  snapshot: ReturnType<ActorRefFrom<typeof engineManagerMachine>['getSnapshot']>
): SlotOpacity {
  if (snapshot.matches({ active: { crossfading: 'settling' } })) return { a: 0, b: 1 };
  if (snapshot.matches({ active: { crossfading: 'waiting' } })) return { a: 1, b: 0 };
  if (snapshot.matches({ active: 'idle' }))                     return { a: 0, b: 1 };
  return { a: 0, b: 0 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EngineSlot({ actorRef, onRefsReady }: Props) {
  const slotARef     = useRef<HTMLDivElement>(null);
  const slotBRef     = useRef<HTMLDivElement>(null);
  const refsNotified = useRef(false);

  // Notify parent once both refs are mounted
  useEffect(() => {
    if (slotARef.current && slotBRef.current && !refsNotified.current) {
      refsNotified.current = true;
      onRefsReady({ slotA: slotARef.current, slotB: slotBRef.current });
    }
  }, [onRefsReady]);

  // Subscribe to actor — write opacity directly to DOM, no re-render
  useEffect(() => {
    function applyOpacity(
      snapshot: ReturnType<ActorRefFrom<typeof engineManagerMachine>['getSnapshot']>
    ): void {
      if (!slotARef.current || !slotBRef.current) return;
      const { a, b } = deriveOpacity(snapshot);
      slotARef.current.style.opacity = String(a);
      slotBRef.current.style.opacity = String(b);
      slotARef.current.toggleAttribute('aria-hidden', a === 0);
      slotBRef.current.toggleAttribute('aria-hidden', b === 0);
    }

    applyOpacity(actorRef.getSnapshot());
    const sub = actorRef.subscribe(applyOpacity);
    return () => sub.unsubscribe();
  }, [actorRef]);

  return (
    <div className={styles.engineSlotRoot}>
      <div ref={slotARef} id="engine-a" className={styles.engineSlot} />
      <div ref={slotBRef} id="engine-b" className={styles.engineSlot} />
    </div>
  );
}
EOF

echo "Creating src/components/EngineSlot/EngineSlot.module.scss..."
cat > src/components/EngineSlot/EngineSlot.module.scss << 'EOF'
// src/components/EngineSlot/EngineSlot.module.scss

.engineSlotRoot {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.engineSlot {
  position: absolute;
  inset: 0;

  // Default hidden — JS actor subscription writes opacity directly to DOM
  opacity: 0;

  // MUST match crossfading.settling `after: { 400 }` in engineManager.machine.ts
  // If these diverge: disposePreviousBridge fires before animation completes → flash
  transition: opacity 400ms ease-in-out;

  // Disable interaction when visually hidden
  &[aria-hidden] {
    pointer-events: none;
  }
}
EOF

echo ""
echo "✅ Phase 2b files created:"
echo "   src/engine/contracts/inputs.ts"
echo "   src/engine/contracts/engine.ts"
echo "   src/engine/contracts/bridge.ts"
echo "   src/engine/engineFactory.ts"
echo "   src/engine/engineManager.machine.ts"
echo "   src/components/EngineSlot/EngineSlot.tsx"
echo "   src/components/EngineSlot/EngineSlot.module.scss"
echo ""
echo "Next: git add + commit + tag v1-phase-2b"
