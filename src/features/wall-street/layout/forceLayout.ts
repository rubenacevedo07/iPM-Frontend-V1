import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import type {
  RelevanceTier,
  WallStreetEdgeData,
  WallStreetNodeData,
} from '@/types/wallStreetGraph'

export function tierToRadius(tier: RelevanceTier): number {
  if (tier === 1) return 70
  if (tier === 2) return 55
  return 42
}

interface SimNode extends SimulationNodeDatum {
  entityId: string
  relevanceTier: RelevanceTier
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  data: WallStreetEdgeData
}

export interface PositionedWallStreetNode extends WallStreetNodeData {
  x: number
  y: number
}

export function computeForceLayout(
  nodes: WallStreetNodeData[],
  edges: Array<{ source: string; target: string; data: WallStreetEdgeData }>,
  width: number,
  height: number,
): PositionedWallStreetNode[] {
  if (nodes.length === 0) return []

  const simNodes: SimNode[] = nodes.map(n => ({
    entityId: n.entityId,
    relevanceTier: n.relevanceTier,
  }))

  const nodeIds = new Set(simNodes.map(n => n.entityId))
  const simLinks: SimLink[] = edges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(e => ({ source: e.source, target: e.target, data: e.data }))

  const simulation = forceSimulation<SimNode>(simNodes)
    .force('charge', forceManyBody<SimNode>().strength(-400))
    .force(
      'link',
      forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.entityId)
        .distance(150)
        .strength(d => d.data.strengthValue ?? 0.5),
    )
    .force('center', forceCenter(width / 2, height / 2))
    .force(
      'collide',
      forceCollide<SimNode>().radius(d => tierToRadius(d.relevanceTier) + 8),
    )
    .stop()

  simulation.tick(300)

  const positionById = new Map<string, { x: number; y: number }>()
  for (const n of simNodes) {
    positionById.set(n.entityId, { x: n.x ?? width / 2, y: n.y ?? height / 2 })
  }

  return nodes.map(n => {
    const pos = positionById.get(n.entityId) ?? { x: width / 2, y: height / 2 }
    return { ...n, x: pos.x, y: pos.y }
  })
}
