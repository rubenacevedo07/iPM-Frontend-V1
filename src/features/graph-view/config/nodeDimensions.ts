// src/features/graph-view/config/nodeDimensions.ts
// Canonical pixel dimensions for each React Flow node type.
// Used by: layout engine (handle routing), viewport fitting, collision detection.
import type { GraphNodeType } from '@/types/graphView'

export const NODE_DIMS: Record<GraphNodeType, { w: number; h: number }> = {
  center: { w: 96,  h: 96 },
  entity: { w: 190, h: 54 },
}
