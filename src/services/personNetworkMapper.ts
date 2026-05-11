import type { EngineArc } from '@/engine/contracts/inputs'
import type { DemoConnection } from '@/features/person-overlay/personFallbackData'

export function mapPersonConnectionsToArcs(
  connections: DemoConnection[],
  clients: DemoConnection[],
  focalCoords: [number, number],
  personNodeId: string,
): EngineArc[] {
  const arcs: EngineArc[] = []

  for (const c of connections) {
    if (c.latitude == null || c.longitude == null) continue
    arcs.push({
      arcId:        `${personNodeId}->${c.nodeId}`,
      sourceNodeId: personNodeId,
      targetNodeId: c.nodeId,
      source:       focalCoords,
      target:       [c.longitude, c.latitude],
      kind:         'connection',
      intensity:    parseFloat(c.score) / 10,
    })
  }

  for (const c of clients) {
    if (c.latitude == null || c.longitude == null) continue
    arcs.push({
      arcId:        `${personNodeId}->${c.nodeId}-partner`,
      sourceNodeId: personNodeId,
      targetNodeId: c.nodeId,
      source:       focalCoords,
      target:       [c.longitude, c.latitude],
      kind:         'partner',
      intensity:    parseFloat(c.score) / 10,
    })
  }

  return arcs
}
