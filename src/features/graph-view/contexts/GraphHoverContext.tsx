import { createContext, useContext } from 'react'

interface HoverCtx {
  hoveredNodeId:    string | null
  connectedNodeIds: Set<string>
  setHoveredNodeId: (id: string | null) => void
}

export const GraphHoverContext = createContext<HoverCtx>({
  hoveredNodeId: null,
  connectedNodeIds: new Set(),
  setHoveredNodeId: () => {},
})

export const useGraphHover = () => useContext(GraphHoverContext)
