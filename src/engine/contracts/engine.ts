// src/engine/contracts/engine.ts
// Engine capability contract — what every engine implementation must satisfy (Rule 4, Rule 5)

import type { AtlasView } from '@/types/atlas';
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
