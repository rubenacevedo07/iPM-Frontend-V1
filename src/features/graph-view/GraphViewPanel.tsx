// src/features/graph-view/GraphViewPanel.tsx
import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GraphViewNodeData, GraphViewEdgeData } from '@/types/graphView'
import { qk, fetchers } from '@/domain/queries'
import { MOCK_NODES, MOCK_EDGES } from './mockGraphData'
import { toLayoutInput } from './adapters'
import { layoutEngine } from './layout/graphLayoutEngine'
import { EntityNode } from './nodes/EntityNode'
import { CenterNode } from './nodes/CenterNode'
import { GlowEdge } from './edges/GlowEdge'
import { RelationPanel } from './nodes/RelationPanel'
import { DossierPanel } from './DossierPanel'
import { GraphHoverContext } from './contexts/GraphHoverContext'
import { GraphEdgeContext } from './contexts/GraphEdgeContext'
import { GlobalGraphStyles } from './GlobalGraphStyles'
import styles from './GraphViewPanel.module.scss'

// Featured center entity for the network panel. Hard-coded for the demo
// (matches the Persons/Relation panels' Musk fixture). Wire to URL/state when
// a persons-browser navigates here. The `qk.personNeighbors` fetcher hits
// `/graph/node/{nodeId}/neighbors` (1-hop today) — see backend-graph-brief.md.
const CENTRAL_NODE_ID = 'person:7'
const CENTRAL_NAME    = 'Elon Musk'

const PANEL_ID = 'panel-rel'
const PANEL_W = 252
const PANEL_H = 108
const PANEL_GAP = 20
const CENTER_W = 96
const CENTER_H = 96
const ENTITY_W = 190
const ENTITY_H = 54

export function GraphViewPanel() {
  const { data, isError } = useQuery({
    queryKey: qk.personNeighbors(CENTRAL_NODE_ID),
    queryFn:  () => fetchers.personNeighbors(CENTRAL_NODE_ID),
    retry:    false,
  })

  const computed = useMemo(() => {
    if (data) {
      return layoutEngine.calculate({
        mode: 'orbital',
        data: toLayoutInput(data, { name: CENTRAL_NAME, type: 'PERSON', nodeId: CENTRAL_NODE_ID }),
      })
    }
    if (isError) {
      // Backend not reachable — fall back to mock fixtures so the panel still
      // renders the visual structure during dev / offline.
      return { nodes: MOCK_NODES, edges: MOCK_EDGES }
    }
    return { nodes: [] as Node<GraphViewNodeData>[], edges: [] as Edge<GraphViewEdgeData>[] }
  }, [data, isError])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphViewNodeData>>(computed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<GraphViewEdgeData>>(computed.edges)

  useEffect(() => {
    setNodes(computed.nodes)
    setEdges(computed.edges)
  }, [computed, setNodes, setEdges])

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const nodeTypes = useMemo(() => ({ entity: EntityNode, center: CenterNode, relationPanel: RelationPanel }), [])
  const edgeTypes = useMemo(() => ({ glow: GlowEdge }), [])

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>()
    const connected = new Set<string>()
    edges.forEach(edge => {
      if (edge.source === hoveredNodeId) {
        connected.add(edge.target)
      }
      if (edge.target === hoveredNodeId) {
        connected.add(edge.source)
      }
    })
    return connected
  }, [hoveredNodeId, edges])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<GraphViewNodeData>) => {
      // Ignore relation panel node
      if (node.id === PANEL_ID) return

      // Clear panel when clicking graph node
      setNodes(nds => nds.filter(n => n.id !== PANEL_ID))
      setSelectedEdgeId(null)

      setSelectedNodeId(node.id)
    },
    [setNodes],
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge<GraphViewEdgeData>) => {
      const srcNode = nodes.find(n => n.id === edge.source)
      const tgtNode = nodes.find(n => n.id === edge.target)
      if (!srcNode || !tgtNode) return

      const srcW = srcNode?.type === 'center' ? CENTER_W : ENTITY_W
      const srcH = srcNode?.type === 'center' ? CENTER_H : ENTITY_H
      const tgtW = ENTITY_W
      const tgtH = ENTITY_H

      const srcCX = srcNode.position.x + srcW / 2
      const srcCY = srcNode.position.y + srcH / 2
      const tgtCX = tgtNode.position.x + tgtW / 2
      const tgtCY = tgtNode.position.y + tgtH / 2

      const panelX = (srcCX + tgtCX) / 2 - PANEL_W / 2
      const panelY = Math.min(srcCY, tgtCY) - PANEL_H - PANEL_GAP

      setNodes(nds => [
        ...nds.filter(n => n.id !== PANEL_ID),
        {
          id: PANEL_ID,
          type: 'relationPanel',
          position: { x: panelX, y: panelY },
          data: {
            ...edge.data,
            sourceLabel: String(srcNode.data?.label || '—'),
            targetLabel: String(tgtNode.data?.label || '—'),
          },
          draggable: true,
          selectable: false,
          zIndex: 21,
        } as any,
      ])

      setSelectedEdgeId(edge.id)
      setSelectedNodeId(null)
    },
    [nodes, setNodes],
  )

  const handlePaneClick = useCallback(() => {
    setNodes(nds => nds.filter(n => n.id !== PANEL_ID))
    setSelectedEdgeId(null)
    setSelectedNodeId(null)
  }, [setNodes])

  const selectedNode = nodes.find(n => n.id === selectedNodeId)

  return (
    <>
      <GlobalGraphStyles />
      <GraphHoverContext.Provider value={{ hoveredNodeId, connectedNodeIds, setHoveredNodeId }}>
        <GraphEdgeContext.Provider value={{ selectedEdgeId }}>
          <div className={styles.graphViewPanel}>
          <div className={styles.header}>
            <span className={styles.title}>Network Graph</span>
            <span className={styles.count}>
              {nodes.length} nodes · {edges.length} edges
            </span>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange as OnNodesChange}
            onEdgesChange={onEdgesChange as OnEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode="dark"
            fitView
            fitViewOptions={{ padding: 0.18 }}
            defaultEdgeOptions={{ animated: false }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(0, 229, 255, 0.04)" />
            <Controls showInteractive={false} />
            <MiniMap nodeColor="rgba(0, 229, 255, 0.15)" maskColor="rgba(4, 8, 16, 0.7)" style={{ bottom: 72, right: 16 }} />
          </ReactFlow>

          <AnimatePresence>
            {selectedNode && (
              <DossierPanel
                label={String(selectedNode.data?.label || 'Unknown')}
                sublabel={selectedNode.data?.sublabel as string | undefined}
                accent={selectedNode.data?.accent as any}
                score={selectedNode.data?.score as string | undefined}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
          </AnimatePresence>
          </div>
        </GraphEdgeContext.Provider>
      </GraphHoverContext.Provider>
    </>
  )
}
