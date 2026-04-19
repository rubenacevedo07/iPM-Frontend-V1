/**
 * useCompanyRelationEdges — GET /api/RelationEdge/by-node/{nodeType}/{nodeId}
 *
 * Returns ALL edges where the node appears as source OR target, enriched
 * with source/target names + ticker + photo. Downstream components filter
 * + categorize via categorizeEdges() helper in company-view/shared.ts.
 *
 * Shape verified via curl 2026-04-19 (NVIDIA=41 edges, Palantir=18 edges).
 *
 * Generic hook — works for any NodeType, not just Company. Naming kept as
 * `useCompanyRelationEdges` to match Phase 5.0b.1 plan. Consider renaming
 * to `useNodeRelationEdges` if other node types consume it.
 */

import { useService, type UseCompanyResult } from './_useService';
import type { NodeType, RelationEdgeDto, Strength } from '@/types/relationEdge';

export type { NodeType, RelationEdgeDto, Strength };

export function useCompanyRelationEdges(
  nodeType: NodeType,
  nodeId:   number | undefined,
): UseCompanyResult<RelationEdgeDto[]> {
  return useService(
    async () => {
      const r = await fetch(`/api/RelationEdge/by-node/${nodeType}/${nodeId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<RelationEdgeDto[]>;
    },
    [nodeType, nodeId],
    nodeId !== undefined && nodeId > 0,
  );
}
