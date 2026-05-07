// src/features/graph-view/transformers/normalizeGraphData.ts
// Single entry point for converting raw API graph data into React Flow nodes/edges.
// All callers (graphMapper, mockGraphData, future API hooks) go through here.
import type { Node, Edge } from '@xyflow/react'
import type { GraphViewNodeData, GraphViewEdgeData } from '@/types/graphView'
import { layoutEngine, type LayoutMode } from '../layout/graphLayoutEngine'

export function normalizeGraphData(
  data: unknown,
  mode: LayoutMode = 'orbital',
): { nodes: Node<GraphViewNodeData>[]; edges: Edge<GraphViewEdgeData>[] } {
  return layoutEngine.calculate({ data, mode })
}
