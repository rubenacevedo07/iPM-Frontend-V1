// src/features/graph-view/graphMapper.ts
// Canonical API contract type (GraphSubgraph) and its adapter to React Flow.
// mapSubgraphToFlow() is the public entry point for live API data.
import type { Node, Edge } from '@xyflow/react'
import type { GraphViewNodeData, GraphViewEdgeData, GraphNodeAccent } from '@/types/graphView'
import { normalizeGraphData } from './transformers/normalizeGraphData'

// GraphSubgraph — wire format returned by the intelligence graph API.
// PascalCase mirrors the server-side naming convention.
export interface GraphSubgraph {
  center: {
    NodeId:    string
    Label:     string
    Type:      'person' | 'company' | 'country'
    DbId?:     string
    Subtitle?: string
    Accent?:   GraphNodeAccent
    Avatar?:   string
    Score?:    string
  }
  nodes: Array<{
    NodeId:    string
    Label:     string
    Type:      'person' | 'company' | 'country'
    DbId?:     string
    Subtitle?: string
    Accent?:   GraphNodeAccent
    Avatar?:   string
    Score?:    string
  }>
  edges: Array<{
    EdgeId:      string
    Source:      string
    Target:      string
    Label?:      string
    EdgeType?:   string
    Strength?:   'Critical' | 'High' | 'Medium' | 'Low'
    Direction?:  '→' | '←' | '↔'
    Since?:      string
    Volume?:     string
    Status?:     string
    StatusType?: 'cyan' | 'amber' | 'green' | 'gray' | 'yellow'
    Flagged?:    boolean
    Color?:      string
    Animated?:   boolean
    Dashed?:     boolean
  }>
}

export function mapSubgraphToFlow(subgraph: GraphSubgraph): {
  nodes: Node<GraphViewNodeData>[]
  edges: Edge<GraphViewEdgeData>[]
} {
  return normalizeGraphData(subgraph, 'orbital')
}
