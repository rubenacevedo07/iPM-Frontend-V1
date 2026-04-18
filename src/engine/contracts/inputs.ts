// src/engine/contracts/inputs.ts
// Pure engine input contracts — NO DTOs, NO wire format, NO API shapes (Rule 4)

import type { EntityRef } from '@/app/app.events';
import type { AtlasView } from '@/types/atlas';

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

/**
 * Phase 4.1: entity data pushed imperatively from React into the bridge.
 * Each entity is EntityRef-shaped (id, nodeId, type, slug, name) plus the
 * coordinate + secondary fields deck.gl needs at the layer level.
 */
export interface EngineEntityData {
  entities: Array<{
    id:            number;
    nodeId:        string;
    type:          'PERSON' | 'COMPANY' | 'COUNTRY';
    slug:          string;
    name:          string;
    latitude:      number;
    longitude:     number;
    marketCapUsd?: number | null;
    isChokepoint?: boolean;
  }>;
}
