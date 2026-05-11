import { useMemo } from 'react'
import {
  ReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useWallStreetData } from '../useWallStreetData'
import {
  POWER_VIEW_NODE_IDS,
  POWER_VIEW_COLOR_OVERRIDES,
} from '../data/powerViewSubset'
import { computeSugiyamaLayout } from '../layout/sugiyamaLayout'
import { useDidacticDimming } from './useDidacticDimming'
import { ViewHeader } from './ViewHeader'
import styles from './didacticView.module.scss'

import { SugiyamaNode } from '../components/SugiyamaNode'
import { GraphHoverContext } from '@/features/graph-view/contexts/GraphHoverContext'
import { GraphEdgeContext }  from '@/features/graph-view/contexts/GraphEdgeContext'
import type { SugiyamaNodeData } from '@/types/_ext/sugiyamaGraph'

type RFNode = Node<SugiyamaNodeData>
type RFEdge = Edge

const NODE_TYPES = { sugiyama: SugiyamaNode }

export function PowerView() {
  const { data, isLoading, error } = useWallStreetData()

  const subset = useMemo(() => {
    if (!data) return null
    const idSet = new Set<string>(POWER_VIEW_NODE_IDS)
    const nodes = data.nodes.filter(n => idSet.has(n.entityId))
    const edges = data.rawEdges.filter(
      e => idSet.has(e.source) && idSet.has(e.target),
    )
    return { nodes, edges }
  }, [data])

  const dimming = useDidacticDimming(subset?.edges ?? [])

  const rfNodes = useMemo<RFNode[]>(() => {
    if (!subset) return []
    return computeSugiyamaLayout(subset.nodes).map(n => ({
      id:        n.entityId,
      type:      'sugiyama',
      position:  { x: n.x, y: n.y },
      data:      n.nodeData,
      draggable: false,
    }))
  }, [subset])

  const rfEdges = useMemo<RFEdge[]>(() => {
    if (!subset) return []
    return subset.edges.map(e => {
      const sl = (e.data.strengthLabel ?? '').toLowerCase()
      const et = e.data.edgeType ?? ''

      // Strength → stroke-width
      const strokeWidth =
        sl === 'critical' ? 2.5 : sl === 'high' ? 1.5 : 0.8

      // Edge type → dasharray (Governs=solid, Partners=none, Monitors="5 4", Risk="2 3")
      // Map actual edge types from the data to the spec categories:
      //   Governs/Regulates/Sets → solid
      //   Monitors/Influences    → "5 4"
      //   Competes/Owns/Risk     → "2 3"
      //   others (Partners etc)  → none
      const strokeDasharray: string | undefined =
        (et === 'Governs' || et === 'Regulates' || et === 'Sets')   ? undefined :
        (et === 'Monitors' || et === 'Influences')                   ? '5 4'    :
        (et === 'Competes' || et === 'Owns' || et === 'Risk')        ? '2 3'    :
        undefined

      // Edge color: keep source-node color (teal/gold/purple/red per tier)
      const stroke = POWER_VIEW_COLOR_OVERRIDES[e.source] ?? e.data.primaryColor

      return {
        id:           e.id,
        source:       e.source,
        target:       e.target,
        type:         'smoothstep',
        sourceHandle: 'src-bottom',
        targetHandle: 'tgt-top',
        style:        { stroke, strokeWidth, strokeDasharray },
      }
    })
  }, [subset])

  const hoverCtxValue = useMemo(() => ({
    hoveredNodeId:    dimming.activeId,
    connectedNodeIds: dimming.connectedIds,
    setHoveredNodeId: dimming.setHoveredId,
  }), [dimming.activeId, dimming.connectedIds, dimming.setHoveredId])

  const edgeCtxValue = useMemo(() => ({ selectedEdgeId: null }), [])

  if (isLoading) {
    return (
      <div className={styles.fullScreenState}>
        <div className={styles.stateText}>Loading…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className={styles.fullScreenState}>
        <div className={styles.stateText}>Failed to load graph data.</div>
        <div className={styles.stateSub}>{error.message}</div>
      </div>
    )
  }
  if (!data || !subset) return null

  return (
    <div className={styles.viewRoot}>
      <ViewHeader
        title="Who runs Wall Street"
        subtitle="The 10 names that move markets."
      />
      <div className={styles.canvasWrapper}>
        <GraphEdgeContext.Provider value={edgeCtxValue}>
          <GraphHoverContext.Provider value={hoverCtxValue}>
            <ReactFlow<RFNode, RFEdge>
              className="ws-flow"
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={NODE_TYPES}
              panOnDrag={false}
              panOnScroll={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              fitView
              proOptions={{ hideAttribution: true }}
              colorMode="dark"
              onNodeMouseEnter={(_, n) => dimming.setHoveredId(n.id)}
              onNodeMouseLeave={() => dimming.setHoveredId(null)}
              onNodeClick={(_, n) => dimming.toggleSelected(n.id)}
              onPaneClick={() => dimming.clearSelected()}
            />
          </GraphHoverContext.Provider>
        </GraphEdgeContext.Provider>
      </div>
    </div>
  )
}
