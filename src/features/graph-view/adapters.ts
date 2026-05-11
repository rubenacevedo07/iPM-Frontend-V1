// src/features/graph-view/adapters.ts
//
// Boundary adapters: domain types (`@/domain/types` per Rule 1) → layout-engine
// view shapes (`LayoutInput` from graphLayoutEngine). Keeps GraphViewPanel free
// of API shape knowledge — components consume already-positioned nodes/edges
// produced by `layoutEngine.calculate(...)`. Mirrors the pattern in
// `src/features/person-overlay/adapters.ts`.

import type { NeighborsResponse, NodeType } from '@/domain/types'
import { getEdgeTypeMeta } from '@/types/_ext/edgeTypes'
import type { LayoutInput, LayoutInputNode } from './layout/graphLayoutEngine'

type LayoutNodeType = LayoutInputNode['Type']

function nodeTypeToLayoutType(t: NodeType): LayoutNodeType {
  const v = String(t).toLowerCase()
  if (v === 'person')  return 'person'
  if (v === 'company') return 'company'
  if (v === 'country') return 'country'
  return 'company'
}

function dbIdFromNodeId(nodeId: string): string {
  const idx = nodeId.indexOf(':')
  return idx >= 0 ? nodeId.slice(idx + 1) : nodeId
}

function scoreToLabel(score: number | null | undefined): string | undefined {
  if (score == null) return undefined
  return score.toFixed(0)
}

/**
 * Build a `LayoutInput` from a `NeighborsResponse`. The response's
 * `centralNodeId` becomes the layout center; remaining nodes form ring 1.
 *
 * @param res            backend NeighborsResponse (1-hop today)
 * @param centerFallback name to use if the central node is missing from
 *                       `res.nodes` (e.g. some endpoints omit it from the list)
 */
export function toLayoutInput(
  res: NeighborsResponse,
  centerFallback?: { name?: string; type?: NodeType },
): LayoutInput {
  const centerNeighbor = res.nodes.find(n => n.nodeId === res.centralNodeId)
  const otherNodes     = res.nodes.filter(n => n.nodeId !== res.centralNodeId)

  const center: LayoutInputNode = centerNeighbor
    ? {
        NodeId: centerNeighbor.nodeId,
        Label:  centerNeighbor.name,
        Type:   nodeTypeToLayoutType(centerNeighbor.type),
        DbId:   dbIdFromNodeId(centerNeighbor.nodeId),
        Score:  scoreToLabel(centerNeighbor.compositeScore),
        Accent: 'primary',
      }
    : {
        NodeId: res.centralNodeId,
        Label:  centerFallback?.name ?? res.centralNodeId,
        Type:   nodeTypeToLayoutType((centerFallback?.type ?? 'PERSON') as NodeType),
        DbId:   dbIdFromNodeId(res.centralNodeId),
        Accent: 'primary',
      }

  return {
    center,
    nodes: otherNodes.map(n => ({
      NodeId: n.nodeId,
      Label:  n.name,
      Type:   nodeTypeToLayoutType(n.type),
      DbId:   dbIdFromNodeId(n.nodeId),
      Score:  scoreToLabel(n.compositeScore),
    })),
    edges: res.edges.map((e, i) => {
      const meta = getEdgeTypeMeta(e.edgeType)
      return {
        EdgeId:   `${e.sourceNodeId}__${e.targetNodeId}__${i}`,
        Source:   e.sourceNodeId,
        Target:   e.targetNodeId,
        EdgeType: e.edgeType,
        Strength: e.strength,
        Color:    meta.color,
        Label:    meta.label,
      }
    }),
  }
}
