import { useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type ReactFlowProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type {
  RelevanceTier,
  WallStreetNodeData,
} from '@/types/wallStreetGraph'
import { useWallStreetData } from '../useWallStreetData'
import { computeForceLayout } from '../layout/forceLayout'
import {
  WallStreetEntityNode,
  type WallStreetNodeRenderData,
} from '../components/WallStreetEntityNode'
import {
  WallStreetGlowEdge,
  type WallStreetEdgeRenderData,
} from '../components/WallStreetGlowEdge'
import { WallStreetGraphStyles } from '../components/WallStreetGraphStyles'
import { ControlPanel } from '../components/ControlPanel'
import { SelectedNodePanel } from '../components/SelectedNodePanel'
import { ViewHeader } from './ViewHeader'
import didactic from './didacticView.module.scss'
import advanced from './AdvancedView.module.scss'

const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 900

type RFNode = Node<WallStreetNodeRenderData>
type RFEdge = Edge<WallStreetEdgeRenderData>

interface EdgeTooltipState {
  edge: RFEdge
  sourceName: string
  targetName: string
  x: number
  y: number
}

const NODE_TYPES = { entity: WallStreetEntityNode }
const EDGE_TYPES = { glow: WallStreetGlowEdge }

function tierIncluded(nodeTier: RelevanceTier, max: 1 | 2 | 3): boolean {
  return nodeTier <= max
}

function tierToSize(tier: RelevanceTier): 'lg' | 'md' | 'sm' {
  if (tier === 1) return 'lg'
  if (tier === 2) return 'md'
  return 'sm'
}

function uniqueModels(models: string[][]): string {
  const set = new Set<string>()
  for (const arr of models) for (const m of arr) set.add(m)
  return Array.from(set).join(', ') || 'unknown'
}

export function AdvancedView() {
  const { data, isLoading, error } = useWallStreetData()

  const [tierFilter, setTierFilter] = useState<1 | 2 | 3>(1)
  const [strengthThreshold, setStrengthThreshold] = useState(0.5)
  const [visibleClusters, setVisibleClusters] = useState<Set<string>>(new Set())
  const [showTemporalPending, setShowTemporalPending] = useState(true)
  const [showNodeLabels, setShowNodeLabels] = useState(true)
  const [showEdgeLabels, setShowEdgeLabels] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [edgeTooltip, setEdgeTooltip] = useState<EdgeTooltipState | null>(null)

  useEffect(() => {
    if (!data) return
    const initialTier = Math.max(1, Math.min(3, data.viewDefaults.initialTierFilter)) as 1 | 2 | 3
    setTierFilter(initialTier)
    setStrengthThreshold(data.viewDefaults.minStrengthVisible)
    setShowTemporalPending(data.viewDefaults.showTemporalPending)
    setVisibleClusters(
      new Set(data.clusters.filter(c => c.defaultVisible).map(c => c.id)),
    )
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return null

    const visibleNodeData = data.nodes.filter(n => {
      if (!tierIncluded(n.relevanceTier, tierFilter)) return false
      const inVisibleCluster = n.clusterIds.some(cid => visibleClusters.has(cid))
      return inVisibleCluster
    })

    const visibleNodeIds = new Set(visibleNodeData.map(n => n.entityId))

    const visibleEdges = data.rawEdges.filter(e => {
      if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return false
      const strength = e.data.strengthValue ?? 0
      if (strength < strengthThreshold) return false
      if (e.data.isTemporalPending && !showTemporalPending) return false
      return true
    })

    return { visibleNodeData, visibleEdges }
  }, [data, tierFilter, visibleClusters, strengthThreshold, showTemporalPending])

  const layout = useMemo(() => {
    if (!filtered) return null
    return computeForceLayout(
      filtered.visibleNodeData,
      filtered.visibleEdges,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    )
  }, [filtered])

  const activeId = selectedNodeId ?? hoveredId

  const connectedIds = useMemo(() => {
    if (!activeId || !filtered) return new Set<string>()
    const set = new Set<string>()
    for (const e of filtered.visibleEdges) {
      if (e.source === activeId) set.add(e.target)
      else if (e.target === activeId) set.add(e.source)
    }
    return set
  }, [activeId, filtered])

  const rfNodes = useMemo<RFNode[]>(() => {
    if (!layout) return []
    return layout.map((n: WallStreetNodeData & { x: number; y: number }) => {
      let dimmedState: WallStreetNodeRenderData['dimmedState'] = 'normal'
      if (activeId) {
        if (n.entityId === activeId || connectedIds.has(n.entityId))
          dimmedState = 'highlighted'
        else dimmedState = 'dimmed'
      }
      return {
        id: n.entityId,
        type: 'entity',
        position: { x: n.x, y: n.y },
        data: {
          ...n,
          nodeSize: tierToSize(n.relevanceTier),
          dimmedState,
          shortLabel: showNodeLabels ? n.canonicalName : '',
        },
        selected: selectedNodeId === n.entityId,
      }
    })
  }, [layout, activeId, connectedIds, selectedNodeId, showNodeLabels])

  const rfEdges = useMemo<RFEdge[]>(() => {
    if (!filtered) return []
    return filtered.visibleEdges.map(e => {
      let dimmedState: WallStreetEdgeRenderData['dimmedState'] = 'normal'
      if (activeId) {
        if (e.source === activeId || e.target === activeId) dimmedState = 'highlighted'
        else dimmedState = 'dimmed'
      }
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'glow',
        data: {
          ...e.data,
          dimmedState,
          isPersistentSelected:
            selectedNodeId !== null &&
            (e.source === selectedNodeId || e.target === selectedNodeId),
          showLabel: showEdgeLabels,
          edgeLabelText: showEdgeLabels ? e.data.edgeType : '',
        },
      }
    })
  }, [filtered, activeId, selectedNodeId, showEdgeLabels])

  const counts = useMemo(() => {
    if (!data || !filtered) {
      return { visibleNodes: 0, totalNodes: 0, visibleEdges: 0, totalEdges: 0 }
    }
    return {
      visibleNodes: filtered.visibleNodeData.length,
      totalNodes: data.nodes.length,
      visibleEdges: filtered.visibleEdges.length,
      totalEdges: data.rawEdges.length,
    }
  }, [data, filtered])

  const modelLabel = useMemo(() => {
    if (!data) return ''
    return uniqueModels(data.nodes.map(n => n.models))
  }, [data])

  const toggleCluster = (clusterId: string) => {
    setVisibleClusters(prev => {
      const next = new Set(prev)
      if (next.has(clusterId)) next.delete(clusterId)
      else next.add(clusterId)
      return next
    })
  }

  const handleNodeClick: NonNullable<ReactFlowProps<RFNode, RFEdge>['onNodeClick']> = (
    _,
    node,
  ) => {
    setSelectedNodeId(prev => (prev === node.id ? null : node.id))
  }

  const handlePaneClick = () => {
    setSelectedNodeId(null)
    setEdgeTooltip(null)
  }

  const handleEdgeMouseEnter: NonNullable<
    ReactFlowProps<RFNode, RFEdge>['onEdgeMouseEnter']
  > = (event, edge) => {
    if (!data) return
    const sourceName = data.nodes.find(n => n.entityId === edge.source)?.canonicalName ?? edge.source
    const targetName = data.nodes.find(n => n.entityId === edge.target)?.canonicalName ?? edge.target
    setEdgeTooltip({
      edge,
      sourceName,
      targetName,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleEdgeMouseLeave = () => setEdgeTooltip(null)

  const selectedNode = useMemo(() => {
    if (!data || !selectedNodeId) return null
    return data.nodes.find(n => n.entityId === selectedNodeId) ?? null
  }, [data, selectedNodeId])

  if (isLoading) {
    return (
      <div className={didactic.fullScreenState}>
        <div className={didactic.stateText}>Loading…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className={didactic.fullScreenState}>
        <div className={didactic.stateText}>Failed to load graph data.</div>
        <div className={didactic.stateSub}>{error.message}</div>
      </div>
    )
  }
  if (!data) return null

  return (
    <div className={didactic.viewRoot}>
      <ViewHeader
        title="Advanced mode"
        subtitle="Explore the full graph: 45 nodes, 76 edges, all clusters."
      />
      <div className={advanced.body}>
        <ControlPanel
          graphName={data.metadata.graph_name}
          counts={counts}
          modelLabel={modelLabel}
          clusters={data.clusters}
          tierFilter={tierFilter}
          onTierFilterChange={setTierFilter}
          strengthThreshold={strengthThreshold}
          onStrengthThresholdChange={setStrengthThreshold}
          visibleClusters={visibleClusters}
          onToggleCluster={toggleCluster}
          showTemporalPending={showTemporalPending}
          onToggleTemporalPending={() => setShowTemporalPending(v => !v)}
          showNodeLabels={showNodeLabels}
          onToggleNodeLabels={() => setShowNodeLabels(v => !v)}
          showEdgeLabels={showEdgeLabels}
          onToggleEdgeLabels={() => setShowEdgeLabels(v => !v)}
        />

        <div className={advanced.canvasWrapper}>
          <ReactFlow<RFNode, RFEdge>
            className="ws-flow"
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodeMouseEnter={(_, n) => setHoveredId(n.id)}
            onNodeMouseLeave={() => setHoveredId(null)}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onEdgeMouseEnter={handleEdgeMouseEnter}
            onEdgeMouseLeave={handleEdgeMouseLeave}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(0,229,255,0.04)"
            />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n: RFNode) => n.data?.primaryClusterColor ?? '#94a3b8'}
              maskColor="rgba(4,8,16,0.7)"
              style={{ bottom: 16, right: 16 }}
            />
            <WallStreetGraphStyles />
          </ReactFlow>

          {edgeTooltip && (
            <div
              className={advanced.edgeTooltip}
              style={{ left: edgeTooltip.x + 12, top: edgeTooltip.y + 12 }}
            >
              <div className={advanced.tooltipType}>
                {edgeTooltip.edge.data?.edgeType ?? '—'}
                {edgeTooltip.edge.data?.isTemporalPending && (
                  <span className={advanced.tooltipPending}> (pending)</span>
                )}
              </div>
              <div className={advanced.tooltipNodes}>
                {edgeTooltip.sourceName} → {edgeTooltip.targetName}
              </div>
              <div className={advanced.tooltipScores}>
                {edgeTooltip.edge.data?.strengthLabel && (
                  <span>
                    strength {edgeTooltip.edge.data.strengthLabel}
                    {edgeTooltip.edge.data.strengthValue !== null &&
                    edgeTooltip.edge.data.strengthValue !== undefined
                      ? ` (${edgeTooltip.edge.data.strengthValue.toFixed(2)})`
                      : ''}
                  </span>
                )}
              </div>
              {edgeTooltip.edge.data?.notes && (
                <div className={advanced.tooltipNotes}>
                  {edgeTooltip.edge.data.notes}
                </div>
              )}
            </div>
          )}

          {selectedNode && (
            <SelectedNodePanel
              node={selectedNode}
              clusters={data.clusters}
              allNodes={data.nodes}
              allEdges={data.rawEdges}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
