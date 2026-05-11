import type { Node, Edge } from '@xyflow/react'
import { normalizeGraphData } from '@/features/graph-view/transformers/normalizeGraphData'
import type { GraphViewNodeData, GraphViewEdgeData } from '@/types/graphView'
import type { NeighborNode, NeighborEdge } from '@/domain/types'

function coerceType(t: string): 'person' | 'company' | 'country' {
  if (t === 'person') return 'person'
  if (t === 'company' || t === 'org') return 'company'
  return 'country'
}

export function neighborToGraphView(
  centralNodeId: string,
  centralName: string,
  nodes: NeighborNode[],
  edges: NeighborEdge[],
): { nodes: Node<GraphViewNodeData>[]; edges: Edge<GraphViewEdgeData>[] } {
  const [, centralId] = centralNodeId.split(':')

  const center = {
    NodeId: centralNodeId,
    Label: centralName,
    Type: 'person' as const,
    DbId: centralId ?? '0',
  }

  const orbitalNodes = nodes.map(n => {
    const [, dbId] = n.nodeId.split(':')
    return {
      NodeId: n.nodeId,
      Label: n.name,
      Type: coerceType(n.type),
      DbId: dbId ?? '0',
      Score: n.compositeScore != null ? String(Math.round(n.compositeScore)) : undefined,
    }
  })

  const orbitalEdges = edges.map(e => ({
    EdgeId: `${e.sourceNodeId}__${e.targetNodeId}__${e.edgeType}`,
    Source: e.sourceNodeId,
    Target: e.targetNodeId,
    Label: e.edgeType,
    EdgeType: e.edgeType,
    Strength: e.strength,
  }))

  return normalizeGraphData({ center, nodes: orbitalNodes, edges: orbitalEdges }, 'orbital')
}
