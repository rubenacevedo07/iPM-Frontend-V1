import { createContext, useContext } from 'react'

interface EdgeCtx {
  selectedEdgeId: string | null
}

export const GraphEdgeContext = createContext<EdgeCtx>({ selectedEdgeId: null })

export const useGraphEdge = () => useContext(GraphEdgeContext)
