import { useMemo, useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GraphViewNodeData, GraphViewEdgeData } from '@/types/graphView'
import type { NeighborNode, NeighborEdge } from '@/domain/types'
import { EntityNode } from '@/features/graph-view/nodes/EntityNode'
import { CenterNode } from '@/features/graph-view/nodes/CenterNode'
import { GlowEdge } from '@/features/graph-view/edges/GlowEdge'
import { GraphHoverContext } from '@/features/graph-view/contexts/GraphHoverContext'
import { GraphEdgeContext } from '@/features/graph-view/contexts/GraphEdgeContext'
import { GlobalGraphStyles } from '@/features/graph-view/GlobalGraphStyles'
import { neighborToGraphView } from './neighborMapper'

interface EgoGraphPanelProps {
  centralNodeId: string
  centralName: string
  nodes: NeighborNode[]
  edges: NeighborEdge[]
  onNodeClick?: (nodeId: string) => void
  selectedNodeId?: string | null
}

export function EgoGraphPanel({
  centralNodeId,
  centralName,
  nodes: neighborNodes,
  edges: neighborEdges,
  onNodeClick,
  selectedNodeId,
}: EgoGraphPanelProps) {
  const layoutedGraphData = useMemo(
    () => neighborToGraphView(centralNodeId, centralName, neighborNodes, neighborEdges),
    [centralNodeId, centralName, neighborNodes, neighborEdges],
  )

  const nodeTypesMap = useMemo(() => ({ entity: EntityNode, center: CenterNode }), [])
  const edgeTypesMap = useMemo(() => ({ glow: GlowEdge }), [])

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>()
    const connected = new Set<string>()
    layoutedGraphData.edges.forEach(edge => {
      if (edge.source === hoveredNodeId) {
        connected.add(edge.target)
      }
      if (edge.target === hoveredNodeId) {
        connected.add(edge.source)
      }
    })
    return connected
  }, [hoveredNodeId, layoutedGraphData.edges])

  // Apply selected state to matching node
  const nodesWithSelection = useMemo(
    () =>
      layoutedGraphData.nodes.map(n => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [layoutedGraphData.nodes, selectedNodeId],
  )

  const [nodes, , onNodesChange] = useNodesState<Node<GraphViewNodeData>>(nodesWithSelection)
  const [edges, , onEdgesChange] = useEdgesState<Edge<GraphViewEdgeData>>(layoutedGraphData.edges)

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<GraphViewNodeData>) => {
      // Ignore center node
      if (node.id === centralNodeId) return
      onNodeClick?.(node.id)
    },
    [centralNodeId, onNodeClick],
  )

  return (
    <>
      <GlobalGraphStyles />
      <GraphHoverContext.Provider value={{ hoveredNodeId, connectedNodeIds, setHoveredNodeId }}>
        <GraphEdgeContext.Provider value={{ selectedEdgeId: null }}>
          <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange as OnNodesChange}
              onEdgesChange={onEdgesChange as OnEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypesMap}
              edgeTypes={edgeTypesMap}
              colorMode="dark"
              fitView
              fitViewOptions={{ padding: 0.18 }}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(0, 229, 255, 0.04)" />
            </ReactFlow>
          </div>
        </GraphEdgeContext.Provider>
      </GraphHoverContext.Provider>
    </>
  )
}
