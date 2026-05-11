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
import { HierarchyZone } from '../components/HierarchyZone'
import {
  computeVerticalLayout,
  rowYRange,
  type HierarchyNodeInput,
} from '../layout/verticalHierarchyLayout'
import {
  COMMAND_CHAIN_NODE_IDS,
  COMMAND_CHAIN_HIERARCHY,
  COMMAND_CHAIN_ZONES,
  COMMAND_CHAIN_COLOR_OVERRIDES,
  COMMAND_CHAIN_DROP_EDGES,
} from '../data/commandChainSubset'
import { useDidacticDimming } from './useDidacticDimming'
import { ViewHeader } from './ViewHeader'
import styles from './didacticView.module.scss'

const PADDING = { top: 80, bottom: 60, sides: 80 }
const TOTAL_LEVELS = 6

type RFNode = Node<WallStreetNodeRenderData>
type RFEdge = Edge<WallStreetEdgeRenderData>

const NODE_TYPES = { entity: WallStreetEntityNode }
const EDGE_TYPES = { glow: WallStreetGlowEdge }

export function CommandChainView() {
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
    const idSet = new Set<string>(COMMAND_CHAIN_NODE_IDS)
    const nodes = data.nodes.filter(n => idSet.has(n.entityId))
    const edges = data.rawEdges.filter(
      e => idSet.has(e.source) && idSet.has(e.target) && !COMMAND_CHAIN_DROP_EDGES(e),
    )
    return { nodes, edges }
  }, [data])

  const dimming = useDidacticDimming(subset?.edges ?? [])

  const layouted = useMemo(() => {
    if (!subset) return []
    const inputs: HierarchyNodeInput[] = subset.nodes.map(n => {
      const meta = COMMAND_CHAIN_HIERARCHY[n.entityId]
      const colorOverride = COMMAND_CHAIN_COLOR_OVERRIDES[n.entityId]
      return {
        ...n,
        ...meta,
        primaryClusterColor: colorOverride ?? n.primaryClusterColor,
      }
    })
    return computeVerticalLayout(inputs, size.width, size.height, PADDING)
  }, [subset, size])

  const rfNodes = useMemo<RFNode[]>(() => {
    return layouted.map(n => {
      const meta = COMMAND_CHAIN_HIERARCHY[n.entityId]
      return {
        id: n.entityId,
        type: 'entity',
        position: { x: n.x, y: n.y },
        data: {
          ...n,
          nodeSize: n.nodeSize,
          dimmedState: dimming.nodeDimmedState(n.entityId),
          shortLabel: meta?.shortLabel,
        },
        selected: dimming.selectedId === n.entityId,
        draggable: false,
      }
    })
  }, [layouted, dimming])

  const rfEdges = useMemo<RFEdge[]>(() => {
    if (!subset) return []
    return subset.edges.map(e => {
      const sourceColor =
        COMMAND_CHAIN_COLOR_OVERRIDES[e.source] ?? e.data.primaryColor
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
        title="The chain of command"
        subtitle="From the US Government down to the people running banks. The Fed Chair changes May 15."
      />
      <div ref={wrapperRef} className={styles.canvasWrapper}>
        <div className={styles.zoneLayer}>
          {COMMAND_CHAIN_ZONES.map((z, i) => {
            const range = rowYRange(z.startLevel, z.endLevel, size.height, PADDING, TOTAL_LEVELS)
            return (
              <HierarchyZone
                key={i}
                y={range.y}
                height={range.height}
                label={z.label}
                color={z.color}
              />
            )
          })}
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
