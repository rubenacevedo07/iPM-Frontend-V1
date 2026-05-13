import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useWallStreetData } from '../useWallStreetData'
import { POWER_VIEW_NODE_IDS } from '../data/powerViewSubset'
import { POWER_LAYOUTS, type PowerLayoutId } from '../layout/layoutRegistry'
import { LayoutSwitcherTabs } from '../components/LayoutSwitcherTabs'
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

const DEFAULT_LAYOUT: PowerLayoutId = 'sugiyama'

export function PowerView() {
  const { data, isLoading, error } = useWallStreetData()
  const search = useSearch({ from: '/wall-street' })
  const layout: PowerLayoutId = search.layout ?? DEFAULT_LAYOUT

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState({ width: 1200, height: 600 })

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setViewport({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
    const strategy = POWER_LAYOUTS[layout]
    return strategy.compute(subset.nodes, subset.edges, viewport).map(n => ({
      id:        n.entityId,
      type:      'sugiyama',
      position:  { x: n.x, y: n.y },
      data:      n.nodeData,
      draggable: false,
    }))
  }, [subset, layout, viewport])

  const rfEdges = useMemo<RFEdge[]>(() => {
    if (!subset) return []
    return subset.edges.map(e => {
      const et = e.data.edgeType ?? ''
      const sl = (e.data.strengthLabel ?? '').toLowerCase()

      // Stroke width from strength
      const strokeWidth =
        sl === 'critical' ? 2.5 :
        sl === 'high'     ? 1.5 :
                            0.8

      // Color from semantic category
      const stroke =
        ['Governs', 'Regulates', 'Sets', 'Monitors'].includes(et)   ? '#00e5ff' : // cyan — formal authority
        ['Owns', 'Custodies', 'Finances', 'Clears'].includes(et)    ? '#f5a623' : // gold — capital / ownership
        et === 'CeoOf'                                              ? '#a855f7' : // purple — operational control
        et === 'Influences'                                         ? '#00d4aa' : // teal — soft influence
                                                                      '#5a6b80'   // gray — other

      // Dash pattern from relation type
      const strokeDasharray =
        et === 'Monitors'   ? '5 4' : // dashed — surveillance
        et === 'Influences' ? '3 3' : // short dash — soft
        et === 'Competes'   ? '2 4' : // dotted — competition
                              undefined

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
      <LayoutSwitcherTabs current={layout} />
      <div ref={wrapperRef} className={styles.canvasWrapper}>
        <GraphEdgeContext.Provider value={edgeCtxValue}>
          <GraphHoverContext.Provider value={hoverCtxValue}>
            <ReactFlow<RFNode, RFEdge>
              className="ws-flow"
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={NODE_TYPES}
              panOnDrag
              panOnScroll={false}
              zoomOnScroll
              zoomOnPinch
              zoomOnDoubleClick={false}
              minZoom={0.4}
              maxZoom={2.5}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              fitView
              fitViewOptions={{ padding: 0.15, includeHiddenNodes: false }}
              proOptions={{ hideAttribution: true }}
              colorMode="dark"
              onNodeMouseEnter={(_, n) => dimming.setHoveredId(n.id)}
              onNodeMouseLeave={() => dimming.setHoveredId(null)}
              onNodeClick={(_, n) => dimming.toggleSelected(n.id)}
              onPaneClick={() => dimming.clearSelected()}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
              <Controls showInteractive={false} position="bottom-right" />
            </ReactFlow>
          </GraphHoverContext.Provider>
        </GraphEdgeContext.Provider>
      </div>
    </div>
  )
}
