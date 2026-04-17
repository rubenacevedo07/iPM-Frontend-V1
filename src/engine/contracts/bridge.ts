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
