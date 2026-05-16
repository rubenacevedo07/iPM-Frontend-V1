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
    // Optional URL to a raster logo/avatar to render at the entity position.
    // Consumed by the globe's IconLayer (see docs/skills/deck-gl-icon-layer).
    // Undefined → fall back to the ScatterplotLayer dot.
    iconUrl?:      string;
    // Photo/logo URL forwarded into EntityRef on click so overlays can render
    // immediately on cold load without a separate fetch.
    photoUrl?:     string | null;
    // Pre-tag (computed in AppShell when building entity batches): for a
    // PERSON entity, the company id co-located at the same headquarters
    // (within ~50 km). Used by the click handler in app.machine to route to
    // the headquarters dual overlay (?overlay=hq) instead of the single
    // gold overlay. Undefined for COMPANY/COUNTRY entities or persons with
    // no detected colocated company.
    coLocatedCompanyId?: number;

    // ───────────────────────────────────────────────────────────────────────
    // Cluster enrichment (geoCluster.ts) — ALL OPTIONAL.
    //
    // The cluster engine works without any of these (pure haversine
    // union-find against `latitude`/`longitude` with `marketCapUsd`-dominant
    // fallback labels). When present, these fields refine the clustering:
    //   - city / countryIso2 / countryName  → human-readable cluster labels
    //   - metroArea                         → SEMANTIC HINT: forces merge
    //     of two entities whose haversine distance exceeds the dynamic
    //     threshold but who share a metro (e.g., Apple Cupertino + an SF
    //     entity both tagged "Bay Area" cluster even if zoom-threshold
    //     would split them)
    //   - cityLat / cityLng / metroLat / metroLng  → canonical centroids
    //     to anchor the cluster badge at the city/metro center instead of
    //     the arithmetic mean of HQ coordinates
    //   - precisionLevel                    → confidence in lat/lng; for
    //     'COUNTRY' entries, lat/lng IS the country centroid (e.g., the
    //     placePersonDot legacy path that sets persons at country
    //     centroids before spread)
    //
    // None of these are PII-sensitive and none affect picking/arc anchors —
    // they exist purely so the cluster engine can produce better labels
    // and better merge decisions. Backend rolls them out incrementally;
    // frontend degrades gracefully when any field is absent.
    // ───────────────────────────────────────────────────────────────────────
    /** City of the entity's lat/lng (English, no diacritics). */
    city?:          string;
    /** ISO 3166-1 alpha-2 country code (UPPERCASE). */
    countryIso2?:   string;
    /** Full English country name. */
    countryName?:   string;
    /** Metropolitan area / economic region. Cluster merge hint. */
    metroArea?:     string;
    /** Canonical city centroid (4 decimals). Falls back to HQ lat/lng. */
    cityLat?:       number;
    cityLng?:       number;
    /** Canonical metro centroid (4 decimals). Anchors cluster badge. */
    metroLat?:      number;
    metroLng?:      number;
    /** Confidence of `latitude`/`longitude`. */
    precisionLevel?: 'CITY' | 'METRO' | 'COUNTRY';
    /** Industry / sector tag (1-2 words). For PERSON, use 'Politics' etc. */
    industry?:      string;
    /** Optional global city economic rank (1..200). Lower = more central. */
    cityRank?:      number;
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
