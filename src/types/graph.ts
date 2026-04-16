/**
 * graph.ts  —  types/graph.ts
 *
 * TypeScript interfaces for the Graph API.
 * Base endpoint: GET /api/graph
 *
 * strength?: string  — 'Critical' | 'High' | 'Medium' | 'Low'
 * Strength is a categorical label (EdgeStrength ENUM cast to text),
 * not a 0–1 float. The DB view confirmed this from the real SQL dump.
 * Use edgeWidth(edge) from useCompanyData.ts to convert to a pixel width.
 */

// ─────────────────────────── Core nodes / edges ───────────────────────────

export interface GraphNodeDto {
  id:        string;
  entityId?: number;
  type:      string;
  label:     string;
  lat?:      number;
  lng?:      number;
}

export interface GraphEdgeDto {
  edgeId:       string;
  source:       string;
  target:       string;
  edgeType:     string;
  /**
   * Categorical strength label: 'Critical' | 'High' | 'Medium' | 'Low'
   * Nullable — some hardcoded edge branches in the view may return NULL.
   * Use edgeWidth(edge) to convert to a DeckGL arc pixel width.
   */
  strength?:    string;
  label?:       string;
  sourceTable?: string;
}

export interface GraphNodeDegreeDto {
  nodeId:          string;
  totalDegree:     number;   // C# long? — safe as JS number up to 2^53
  dependencyCount: number;
  criticalCount:   number;
}

// ─────────────────────────── Composite responses ──────────────────────────

export interface GraphNodeDetailDto {
  node:    GraphNodeDto;
  degree?: GraphNodeDegreeDto;
}

export interface SubgraphDto {
  center: GraphNodeDto;
  nodes:  GraphNodeDto[];
  edges:  GraphEdgeDto[];
}

export interface GraphEdgeWithTimelineDto {
  edgeId:              string;
  source:              string;
  target:              string;
  edgeType:            string;
  /**
   * Same categorical label as GraphEdgeDto.strength.
   */
  strength?:           string;
  label?:              string;
  sourceTable?:        string;
  timelineImpactCount: number;  // C# long — safe as JS number
  openTimelineCount:   number;  // C# long — safe as JS number
  openTimelineIds:     string[]; // Guid → string via default JSON serialization
}

export interface TopNodeDto {
  node:   GraphNodeDto;
  degree: GraphNodeDegreeDto;
}

// ─────────────────────────── Request params ───────────────────────────────

export interface GraphSearchRequest {
  query?:    string;
  nodeType?: string;
  limit?:    number;
}

export interface TopNodesRequest {
  nodeType?: string;
  sortBy?:   "total" | "dependency" | "critical";
  limit?:    number;
}

export interface EdgeRiskDto {
  edgeId:              string;
  targetNodeId:        string;
  targetLabel:         string;
  edgeType:            string;
  strength:            string;
  riskScore:           number;
  openTimelineCount:   number;
  timelineImpactCount: number;
  openTimelineIds:     string[];
}