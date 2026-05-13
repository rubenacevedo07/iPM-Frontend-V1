import type { WallStreetNodeData, WallStreetRawEdge } from '@/types/wallStreetGraph'
import { computeSugiyamaLayout, type PositionedSugiyamaNode } from './sugiyamaLayout'
import { computeForceLayout } from './forceLayout'
import { computeVerticalLayout, type HierarchyNodeInput } from './verticalHierarchyLayout'
import { POWER_VIEW_HIERARCHY } from '../data/powerViewSubset'
import { buildSugiyamaNodeData } from './nodeDecoration'

export type PowerLayoutId = 'sugiyama' | 'force' | 'vertical'

export interface PowerLayoutStrategy {
  id:          PowerLayoutId
  label:       string
  description: string
  compute(
    nodes: WallStreetNodeData[],
    edges: WallStreetRawEdge[],
    viewport: { width: number; height: number },
  ): PositionedSugiyamaNode[]
}

const sugiyamaStrategy: PowerLayoutStrategy = {
  id:          'sugiyama',
  label:       'Cluster',
  description: 'Cluster columns — each bank = column [AM ↑ bank ↓ CEO], Fed on top',
  compute(nodes, edges) {
    return computeSugiyamaLayout(nodes, edges)
  },
}

const forceStrategy: PowerLayoutStrategy = {
  id:          'force',
  label:       'Force',
  description: 'D3 force-directed — reveals clusters',
  compute(nodes, edges, viewport) {
    const w = Math.max(viewport.width,  600)
    const h = Math.max(viewport.height, 400)
    const positioned = computeForceLayout(nodes, edges, w, h)
    return positioned.map(n => ({
      entityId: n.entityId,
      x:        n.x,
      y:        n.y,
      nodeData: buildSugiyamaNodeData(n),
    }))
  },
}

const verticalStrategy: PowerLayoutStrategy = {
  id:          'vertical',
  label:       'Vertical',
  description: 'Even-spaced vertical hierarchy by tier',
  compute(nodes, _edges, viewport) {
    const w = Math.max(viewport.width,  600)
    const h = Math.max(viewport.height, 400)

    const hierarchyInputs: HierarchyNodeInput[] = nodes.map(n => {
      const meta = POWER_VIEW_HIERARCHY[n.entityId]
      return {
        ...n,
        hierarchyLevel: meta?.hierarchyLevel ?? 0,
        columnIndex:    meta?.columnIndex    ?? 0,
        columnsInLevel: meta?.columnsInLevel ?? 1,
        nodeSize:       meta?.nodeSize       ?? 'md',
      }
    })

    const positioned = computeVerticalLayout(
      hierarchyInputs,
      w,
      h,
      { top: 60, bottom: 60, sides: 80 },
    )

    return positioned.map(n => ({
      entityId: n.entityId,
      x:        n.x,
      y:        n.y,
      nodeData: buildSugiyamaNodeData(n),
    }))
  },
}

export const POWER_LAYOUTS: Record<PowerLayoutId, PowerLayoutStrategy> = {
  sugiyama: sugiyamaStrategy,
  force:    forceStrategy,
  vertical: verticalStrategy,
}

export const POWER_LAYOUT_ORDER: PowerLayoutId[] = ['sugiyama', 'force', 'vertical']
