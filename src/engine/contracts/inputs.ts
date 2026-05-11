// src/engine/contracts/inputs.ts
// Pure engine input contracts — NO DTOs, NO wire format, NO API shapes (Rule 4)

import type { EntityRef } from '@/app/app.events';
import type { AtlasView } from '@/types/atlas';

/** Canonical identifier for a registered engine implementation */
export type EngineId = 'globe' | 'network' | 'force' | 'graph';

/**
 * Sprint 2 — graph layout in flat buffers (no DTO; mapper at service boundary
 * maps domain → these arrays). Aligned with `ipm-engine-runtime` TypedArray rule.
 */
export interface GraphEngineInput {
  nodeCount: number
  edgeCount: number
  nodeIds: string[]
  /** [x0,y0,x1,y1,...] in normalized layout space (e.g. -1..1; mapper-defined). */
  nodeXY: Float32Array
  edgeFrom: Uint32Array
  edgeTo: Uint32Array
  selectedNodeIndex: number
  highlightedEdgeIndex: number
  degraded?: boolean
}

export interface GraphEngineData {
  graph: GraphEngineInput
}

export function createEmptyGraphEngineInput(): GraphEngineInput {
  return {
    nodeCount:         0,
    edgeCount:         0,
    nodeIds:           [],
    nodeXY:            new Float32Array(0),
    edgeFrom:          new Uint32Array(0),
    edgeTo:            new Uint32Array(0),
    selectedNodeIndex:  -1,
    highlightedEdgeIndex: -1,
  };
}

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
    isGold?:       boolean;
  }>;
}

/**
 * Phase 8: network edge (arc) for the globe.
 *
 * Pure engine input — no DTO fields, no API shape. `source` and `target` are
 * [longitude, latitude] pairs consumed directly by deck.gl's ArcLayer.
 * `intensity` is a pre-clamped scalar (0.3..1.0 at the mapper) that the bridge
 * maps to stroke width and alpha in the layer accessors.
 *
 * `arcId` format convention: `${sourceNodeId}->${targetNodeId}` for stability
 * across re-fetches of the same focal company's network.
 */
export interface EngineArc {
  arcId:        string;
  sourceNodeId: string;
  targetNodeId: string;
  source:       [number, number];
  target:       [number, number];
  kind:         'supplier' | 'client' | 'connection' | 'partner';
  intensity:    number;
}

export interface EngineArcData {
  arcs: EngineArc[];
}

/**
 * Phase 8+: company-selection context pushed from CompanyGlobe.tsx when an
 * overlay is open. Carries the data the globe needs to render layers 2 + 10-13:
 * market-continent fills, fabric halos, and the selected-company glow.
 *
 * Pure engine input — no DTO fields. Mapper at CompanyGlobe (service boundary).
 */
export interface EngineCompanySelection {
  company: { nodeId: string; latitude: number; longitude: number };
  fabrics: Array<{ lat: number; lng: number; employees: number; name: string }>;
  marketContinents: string[];
}

export interface EngineCompanySelectionData {
  selection: EngineCompanySelection | null;
}
