/**
 * relationEdge.ts — types/relationEdge.ts
 *
 * Canonical shape for GET /api/RelationEdge/by-node/{nodeType}/{nodeId}.
 * Backend verified via curl 2026-04-19 (NVIDIA Company/1 → 41 edges,
 * Palantir Company/96 → 18 edges).
 *
 * The backend enriches each edge with source/target entity names + ticker
 * + photo (batch-lookup inside the controller). Title fields are NOT
 * populated by the DTO — the `label` field on the edge itself carries rich
 * context like "CEO & Co-founder of NVIDIA" or "NVIDIA single-source TSMC".
 *
 * baselineRiskScore / baselineSeverity were omitted by the backend (Option A
 * per the RelationEdge vs EdgeRiskScore discussion). Frontend sorting falls
 * back to the categorical Strength enum.
 */

/** Node types supported by the backend validation list (11 values) */
export type NodeType =
  | 'Company'
  | 'Person'
  | 'Country'
  | 'Commodity'
  | 'AssetManager'
  | 'Bank'
  | 'ETF'
  | 'Sector'
  | 'SovereignWealthFund'
  | 'PowerMap'
  | 'Facility';

/**
 * Edge strength categorical.
 * Confirmed from DB SQL dump + CLAUDE.md comment.
 */
export type Strength = 'Critical' | 'High' | 'Medium' | 'Low';

/**
 * Full edge DTO returned by the by-node endpoint. Matches
 * RelationEdgeDto in the backend controller.
 */
export interface RelationEdgeDto {
  id:           number;

  sourceType:   NodeType;
  sourceId:     number;
  targetType:   NodeType;
  targetId:     number;

  edgeType:     string;      // e.g. "Owns" | "DependsOn" | "Supplies" | "Governs" | "Competes" | "Partners" | "Regulates" | "Exports" | "Sanctions" (keeping wide until full enum enumerated)
  strength:     Strength;

  label:        string | null;
  description:  string | null;
  value:        number | null;
  sourceUrl:    string | null;
  isVerified:   boolean;

  createdAt:    string;      // ISO timestamp
  updatedAt:    string;      // ISO timestamp

  /** Enriched source identity (batch-looked-up in backend controller) */
  sourceName:   string | null;
  sourceTicker: string | null;
  sourcePhoto:  string | null;

  /** Enriched target identity */
  targetName:   string | null;
  targetTicker: string | null;
  targetPhoto:  string | null;
}
