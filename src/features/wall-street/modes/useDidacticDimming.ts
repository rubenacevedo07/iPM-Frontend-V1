import { useMemo, useState } from 'react'
import type { WallStreetRawEdge } from '@/types/wallStreetGraph'
import type { WallStreetEdgeDimmedState } from '../components/WallStreetGlowEdge'
import type { WallStreetNodeDimmedState } from '../components/WallStreetEntityNode'

export interface DidacticDimmingState {
  hoveredId: string | null
  selectedId: string | null
  activeId: string | null
  connectedIds: Set<string>
  setHoveredId: (id: string | null) => void
  toggleSelected: (id: string) => void
  clearSelected: () => void
  nodeDimmedState: (nodeId: string) => WallStreetNodeDimmedState
  edgeDimmedState: (source: string, target: string) => WallStreetEdgeDimmedState
}

export function useDidacticDimming(
  edges: WallStreetRawEdge[],
): DidacticDimmingState {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const activeId = selectedId ?? hoveredId

  const connectedIds = useMemo(() => {
    if (!activeId) return new Set<string>()
    const set = new Set<string>()
    for (const e of edges) {
      if (e.source === activeId) set.add(e.target)
      else if (e.target === activeId) set.add(e.source)
    }
    return set
  }, [activeId, edges])

  const nodeDimmedState = (nodeId: string): WallStreetNodeDimmedState => {
    if (!activeId) return 'normal'
    if (nodeId === activeId) return 'highlighted'
    if (connectedIds.has(nodeId)) return 'highlighted'
    return 'dimmed'
  }

  const edgeDimmedState = (source: string, target: string): WallStreetEdgeDimmedState => {
    if (!activeId) return 'normal'
    if (source === activeId || target === activeId) return 'highlighted'
    return 'dimmed'
  }

  const toggleSelected = (id: string) =>
    setSelectedId(prev => (prev === id ? null : id))

  const clearSelected = () => setSelectedId(null)

  return {
    hoveredId,
    selectedId,
    activeId,
    connectedIds,
    setHoveredId,
    toggleSelected,
    clearSelected,
    nodeDimmedState,
    edgeDimmedState,
  }
}
