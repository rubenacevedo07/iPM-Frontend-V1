// src/types/graphView.ts
// Frontend-only types for the ReactFlow graph view panel.
// Not an API DTO — no wire format, no backend shape.

export type GraphViewNodeType = 'Person' | 'Company' | 'Country'
export type GraphNodeAccent  = 'primary' | 'warning' | 'success' | 'secondary' | 'default'

// React Flow node type discriminator (rendering layer, not business domain)
export type GraphNodeType = 'center' | 'entity'

// Semantic edge relationship variants — drives color config in Phase 2+
export type EdgeVariant = 'ownership' | 'risk' | 'influence' | 'inferred' | 'dependency'

// extends Record<string, unknown> required by @xyflow/react generic constraints
export interface GraphViewNodeData extends Record<string, unknown> {
  label:     string
  sublabel?: string
  nodeType:  GraphViewNodeType
  accent?:   GraphNodeAccent
  avatar?:   string
  score?:    string
  entityId:  number
  isCenter?: boolean
}

export interface GraphViewEdgeData extends Record<string, unknown> {
  edgeType?:   string
  strength?:   'Critical' | 'High' | 'Medium' | 'Low'
  color?:      string
  dashed?:     boolean
  animated?:   boolean
  ring2Edge?:  boolean
  relType?:    string
  direction?:  '→' | '←' | '↔'
  since?:      string
  volume?:     string
  status?:     string
  statusType?: 'cyan' | 'amber' | 'green' | 'gray' | 'yellow'
  flagged?:    boolean
  variant?:    EdgeVariant
}
