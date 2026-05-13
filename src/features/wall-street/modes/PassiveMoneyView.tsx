import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useWallStreetData } from '../useWallStreetData'
import {
  WallStreetEntityNode,
  type WallStreetNodeRenderData,
} from '../components/WallStreetEntityNode'
import {
  WallStreetGlowEdge,
  type WallStreetEdgeRenderData,
} from '../components/WallStreetGlowEdge'
import { WallStreetGraphStyles } from '../components/WallStreetGraphStyles'
import {
  PASSIVE_MONEY_NODE_IDS,
  PASSIVE_MONEY_LEFT_IDS,
  PASSIVE_MONEY_RIGHT_IDS,
  PASSIVE_MONEY_SHORT_LABEL,
  PASSIVE_MONEY_COLOR_OVERRIDES,
} from '../data/passiveMoneySubset'
import { useDidacticDimming } from './useDidacticDimming'
import { ViewHeader } from './ViewHeader'
import styles from './didacticView.module.scss'

const NODE_WIDTH_LG = 130
const NODE_HEIGHT_LG = 58
const PADDING = { top: 100, bottom: 80 }

type RFNode = Node<WallStreetNodeRenderData>
type RFEdge = Edge<WallStreetEdgeRenderData>

const NODE_TYPES = { entity: WallStreetEntityNode }
const EDGE_TYPES = { glow: WallStreetGlowEdge }

export function PassiveMoneyView() {
  const { data, isLoading, error } = useWallStreetData()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 1200, height: 700 })

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const subset = useMemo(() => {
    if (!data) return null
    const idSet = new Set<string>(PASSIVE_MONEY_NODE_IDS)
    const nodes = data.nodes.filter(n => idSet.has(n.entityId))
    const edges = data.rawEdges.filter(
      e => idSet.has(e.source) && idSet.has(e.target) && e.data.edgeType === 'Owns',
    )
    return { nodes, edges }
  }, [data])

  const dimming = useDidacticDimming(subset?.edges ?? [])

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    if (!subset) return map

    const usableHeight = size.height - PADDING.top - PADDING.bottom
    const leftX = size.width * 0.25 - NODE_WIDTH_LG / 2
    const rightX = size.width * 0.75 - NODE_WIDTH_LG / 2

    PASSIVE_MONEY_LEFT_IDS.forEach((id, i) => {
      const slotHeight = usableHeight / PASSIVE_MONEY_LEFT_IDS.length
      const y = PADDING.top + i * slotHeight + slotHeight / 2 - NODE_HEIGHT_LG / 2
      map.set(id, { x: leftX, y })
    })
    PASSIVE_MONEY_RIGHT_IDS.forEach((id, i) => {
      const slotHeight = usableHeight / PASSIVE_MONEY_RIGHT_IDS.length
      const y = PADDING.top + i * slotHeight + slotHeight / 2 - NODE_HEIGHT_LG / 2
      map.set(id, { x: rightX, y })
    })
    return map
  }, [subset, size])

  const rfNodes = useMemo<RFNode[]>(() => {
    if (!subset) return []
    return subset.nodes.map(n => {
      const pos = positions.get(n.entityId) ?? { x: 0, y: 0 }
      const colorOverride = PASSIVE_MONEY_COLOR_OVERRIDES[n.entityId]
      return {
        id: n.entityId,
        type: 'entity',
        position: pos,
        data: {
          ...n,
          primaryClusterColor: colorOverride ?? n.primaryClusterColor,
          nodeSize: 'lg',
          dimmedState: dimming.nodeDimmedState(n.entityId),
          shortLabel: PASSIVE_MONEY_SHORT_LABEL[n.entityId],
        },
        selected: dimming.selectedId === n.entityId,
        draggable: false,
      }
    })
  }, [subset, positions, dimming])

  const rfEdges = useMemo<RFEdge[]>(() => {
    if (!subset) return []
    return subset.edges.map(e => {
      const sourceColor =
        PASSIVE_MONEY_COLOR_OVERRIDES[e.source] ?? e.data.primaryColor
      const mag = e.data.magnitude ?? 0
      const labelText = mag > 0 ? `${mag}%` : ''
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'glow',
        data: {
          ...e.data,
          primaryColor: sourceColor,
          dimmedState: dimming.edgeDimmedState(e.source, e.target),
          isPersistentSelected:
            dimming.selectedId !== null &&
            (e.source === dimming.selectedId || e.target === dimming.selectedId),
          straightLine: true,
          showLabel: true,
          edgeLabelText: labelText,
          // For PassiveMoneyView, scale stroke width aggressively from magnitude
          strengthValue: Math.min(1, (2 + mag * 0.6) / 4),
        },
      }
    })
  }, [subset, dimming])

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
        title="Who actually owns Apple"
        subtitle="The Big Three asset managers hold huge passive stakes in every American mega-cap."
      />
      <div ref={wrapperRef} className={styles.canvasWrapper}>
        <div className={styles.columnHeaders}>
          <span className={styles.columnHeader}>Asset Managers</span>
          <span className={styles.columnHeader}>Companies They Own</span>
        </div>

        <div className={styles.flowLayer}>
          <ReactFlow<RFNode, RFEdge>
            className="ws-flow"
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            fitView={false}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
            onNodeMouseEnter={(_, n) => dimming.setHoveredId(n.id)}
            onNodeMouseLeave={() => dimming.setHoveredId(null)}
            onNodeClick={(_, n) => dimming.toggleSelected(n.id)}
            onPaneClick={() => dimming.clearSelected()}
          >
            <WallStreetGraphStyles />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
