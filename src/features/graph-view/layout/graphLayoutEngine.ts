// src/features/graph-view/layout/graphLayoutEngine.ts
// Central graph layout abstraction. All node positioning, edge generation, and
// handle routing lives here. React Flow components remain layout-agnostic.
import type { Node, Edge } from '@xyflow/react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import type {
  GraphViewNodeData,
  GraphViewEdgeData,
  GraphViewNodeType,
  GraphNodeAccent,
  EdgeVariant,
  GraphNodeType,
} from '@/types/graphView'
import { NODE_DIMS } from '../config/nodeDimensions'

// ── Public types ─────────────────────────────────────────────────────────────

export type LayoutMode = 'orbital' | 'dagre-lr' | 'dagre-tb' | 'force' | 'cluster'

interface LayoutEngineInput<T = unknown> {
  data: T
  mode: LayoutMode
}

interface LayoutEngineOutput {
  nodes: Node<GraphViewNodeData>[]
  edges: Edge<GraphViewEdgeData>[]
}

// ── Public layout-engine input types ─────────────────────────────────────────
// Exported so adapters (`features/graph-view/adapters.ts`) can produce
// LayoutInput values from domain `NeighborsResponse`. Structurally compatible
// with GraphSubgraph (graphMapper.ts).

export interface LayoutInputNode {
  NodeId:    string
  Label:     string
  Type:      'person' | 'company' | 'country'
  DbId?:     string
  Subtitle?: string
  Accent?:   GraphNodeAccent
  Avatar?:   string
  Score?:    string
}

export interface LayoutInputEdge {
  EdgeId:      string
  Source:      string
  Target:      string
  Label?:      string
  EdgeType?:   string
  Strength?:   'Critical' | 'High' | 'Medium' | 'Low'
  Direction?:  '→' | '←' | '↔'
  Since?:      string
  Volume?:     string
  Status?:     string
  StatusType?: 'cyan' | 'amber' | 'green' | 'gray' | 'yellow'
  Flagged?:    boolean
  Color?:      string
  Animated?:   boolean
  Dashed?:     boolean
}

export interface LayoutInput {
  center: LayoutInputNode
  nodes:  LayoutInputNode[]
  edges:  LayoutInputEdge[]
}

// Minimal engine-internal node shape used only for geometry calculations
interface EngineNode {
  id:       string
  rfType:   GraphNodeType
  position: { x: number; y: number }
}

// ── Handle routing (pure geometry) ───────────────────────────────────────────
// Determines which cardinal handles to use based on the vector between node
// centers. No orbital-angle dependency — works for any layout mode.

const VALID_HANDLES = new Set([
  'src-top', 'src-right', 'src-bottom', 'src-left',
  'tgt-top', 'tgt-right', 'tgt-bottom', 'tgt-left',
])

function resolveHandles(
  src: EngineNode,
  tgt: EngineNode,
): { sourceHandle: string; targetHandle: string } {
  const { w: sw, h: sh } = NODE_DIMS[src.rfType]
  const { w: tw, h: th } = NODE_DIMS[tgt.rfType]

  const srcCX = src.position.x + sw / 2
  const srcCY = src.position.y + sh / 2
  const tgtCX = tgt.position.x + tw / 2
  const tgtCY = tgt.position.y + th / 2

  const dx    = tgtCX - srcCX
  const dy    = tgtCY - srcCY
  const angle = Math.atan2(dy, dx) // right=0, down=π/2, left=±π, up=-π/2

  const Q = Math.PI / 4 // 45°
  if (angle > -Q      && angle <=  Q)       return { sourceHandle: 'src-right',  targetHandle: 'tgt-left'   }
  if (angle >  Q      && angle <=  3 * Q)   return { sourceHandle: 'src-bottom', targetHandle: 'tgt-top'    }
  if (angle > -3 * Q  && angle <= -Q)       return { sourceHandle: 'src-top',    targetHandle: 'tgt-bottom' }
  return                                            { sourceHandle: 'src-left',   targetHandle: 'tgt-right'  }
}

// ── Orbital layout helpers ────────────────────────────────────────────────────

const ORBITAL_CX = 430
const ORBITAL_CY = 270
const ORBITAL_R1 = 260

function orbitAngle(i: number, n: number): number {
  return (360 / n) * i
}

function orbitPos(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: Math.round(ORBITAL_CX + radius * Math.sin(rad) - 95),
    y: Math.round(ORBITAL_CY - radius * Math.cos(rad) - 27),
  }
}

function mapEntityType(type: 'person' | 'company' | 'country'): GraphViewNodeType {
  if (type === 'person')  return 'Person'
  if (type === 'company') return 'Company'
  return 'Country'
}

function strengthToVariant(strength?: string): EdgeVariant | undefined {
  if (strength === 'Critical') return 'risk'
  if (strength === 'High')     return 'influence'
  if (strength === 'Medium')   return 'ownership'
  if (strength === 'Low')      return 'inferred'
  return undefined
}

// ── Shared output builder ─────────────────────────────────────────────────────
// Both orbital and force strategies produce the same shape. Strategies only
// differ in *how* they compute (centerPos, ringPositions); everything else
// (node data, edge data, handle resolution) is identical.

function buildOutput(
  data: LayoutInput,
  centerPos: { x: number; y: number },
  ringPositions: Array<{ x: number; y: number }>,
): LayoutEngineOutput {
  const centerEngineNode: EngineNode = {
    id:       data.center.NodeId,
    rfType:   'center',
    position: centerPos,
  }

  const ring1EngineNodes: EngineNode[] = data.nodes.map((n, i) => ({
    id:       n.NodeId,
    rfType:   'entity' as GraphNodeType,
    position: ringPositions[i] ?? { x: 0, y: 0 },
  }))

  const nodeMap = new Map<string, EngineNode>(
    [centerEngineNode, ...ring1EngineNodes].map(n => [n.id, n]),
  )

  const nodes: Node<GraphViewNodeData>[] = [
    {
      id:       data.center.NodeId,
      type:     'center',
      position: centerEngineNode.position,
      data: {
        label:    data.center.Label,
        sublabel: data.center.Subtitle,
        nodeType: mapEntityType(data.center.Type),
        accent:   data.center.Accent ?? 'primary',
        avatar:   data.center.Avatar,
        score:    data.center.Score,
        entityId: parseInt(data.center.DbId ?? '0', 10),
        isCenter: true,
      },
    },
    ...data.nodes.map((n, i) => ({
      id:       n.NodeId,
      type:     'entity' as const,
      position: ring1EngineNodes[i].position,
      data: {
        label:    n.Label,
        sublabel: n.Subtitle,
        nodeType: mapEntityType(n.Type),
        accent:   n.Accent ?? ('secondary' as GraphNodeAccent),
        avatar:   n.Avatar,
        score:    n.Score,
        entityId: parseInt(n.DbId ?? '0', 10),
      },
    } satisfies Node<GraphViewNodeData>)),
  ]

  const edges: Edge<GraphViewEdgeData>[] = data.edges.map(e => {
    const srcNode = nodeMap.get(e.Source)
    const tgtNode = nodeMap.get(e.Target)
    const variant = strengthToVariant(e.Strength)

    const handles = srcNode && tgtNode
      ? resolveHandles(srcNode, tgtNode)
      : { sourceHandle: 'src-right', targetHandle: 'tgt-left' }

    if (process.env.NODE_ENV === 'development') {
      if (!VALID_HANDLES.has(handles.sourceHandle) || !VALID_HANDLES.has(handles.targetHandle)) {
        console.warn(`[graphLayoutEngine] invalid handles for edge ${e.EdgeId}`, handles)
      }
    }

    return {
      id:           e.EdgeId,
      source:       e.Source,
      target:       e.Target,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      type: 'glow',
      data: {
        edgeType:   e.EdgeType,
        strength:   e.Strength,
        variant,
        color:      e.Color ?? (e.Strength === 'Critical' ? '#F5A623' : '#00E5FF'),
        animated:   e.Animated ?? (variant != null && variant !== 'inferred'),
        dashed:     e.Dashed,
        relType:    e.Label,
        direction:  e.Direction,
        since:      e.Since,
        volume:     e.Volume,
        status:     e.Status,
        statusType: e.StatusType,
        flagged:    e.Flagged,
      },
    }
  })

  return { nodes, edges }
}

// ── Orbital strategy implementation ──────────────────────────────────────────

function calculateOrbital(rawData: unknown): LayoutEngineOutput {
  const data = rawData as LayoutInput
  const centerPos = { x: 382, y: 222 }
  const ringPositions = data.nodes.map((_, i) =>
    orbitPos(orbitAngle(i, data.nodes.length), ORBITAL_R1),
  )
  return buildOutput(data, centerPos, ringPositions)
}

// ── Force-directed strategy implementation ───────────────────────────────────
// Synchronous d3-force simulation: configure forces → run a fixed tick budget
// → read final (x, y) for each node. d3-force gives node-CENTER coordinates;
// React Flow expects top-left, so we offset by half-width/half-height per
// node type when emitting positions. The center node is pinned at the origin
// to keep the ego-graph visually anchored.

interface SimNode extends SimulationNodeDatum {
  id: string
  rfType: GraphNodeType
}

const FORCE_TICKS         = 300
const FORCE_LINK_DISTANCE = 220
const FORCE_CHARGE        = -900
const FORCE_COLLIDE_R     = 110
const FORCE_CENTER_X      = ORBITAL_CX
const FORCE_CENTER_Y      = ORBITAL_CY

function calculateForce(rawData: unknown): LayoutEngineOutput {
  const data = rawData as LayoutInput

  const simNodes: SimNode[] = [
    { id: data.center.NodeId, rfType: 'center', fx: FORCE_CENTER_X, fy: FORCE_CENTER_Y },
    ...data.nodes.map<SimNode>(n => ({ id: n.NodeId, rfType: 'entity' })),
  ]
  const simLinks: SimulationLinkDatum<SimNode>[] = data.edges.map(e => ({
    source: e.Source,
    target: e.Target,
  }))

  const sim = forceSimulation(simNodes)
    .force('charge',  forceManyBody<SimNode>().strength(FORCE_CHARGE))
    .force('link',    forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
                        .id(d => d.id)
                        .distance(FORCE_LINK_DISTANCE))
    .force('center',  forceCenter(FORCE_CENTER_X, FORCE_CENTER_Y))
    .force('collide', forceCollide<SimNode>().radius(FORCE_COLLIDE_R))
    .stop()

  for (let i = 0; i < FORCE_TICKS; i++) sim.tick()

  function centerToTopLeft(n: SimNode): { x: number; y: number } {
    const dims = NODE_DIMS[n.rfType]
    return {
      x: Math.round((n.x ?? FORCE_CENTER_X) - dims.w / 2),
      y: Math.round((n.y ?? FORCE_CENTER_Y) - dims.h / 2),
    }
  }

  const centerSim = simNodes[0]
  const ringSim   = simNodes.slice(1)
  return buildOutput(
    data,
    centerToTopLeft(centerSim),
    ringSim.map(centerToTopLeft),
  )
}

// ── Strategy registry ─────────────────────────────────────────────────────────
// Object-based dispatch; add future engines here without touching any renderer.

const layoutStrategies: Record<LayoutMode, (data: unknown) => LayoutEngineOutput> = {
  'orbital':  calculateOrbital,
  'dagre-lr': calculateOrbital, // placeholder — replace when dagre is added
  'dagre-tb': calculateOrbital, // placeholder
  'force':    calculateForce,
  'cluster':  calculateOrbital, // placeholder
}

// ── Public API ────────────────────────────────────────────────────────────────

export const layoutEngine = {
  calculate<T = unknown>(input: LayoutEngineInput<T>): LayoutEngineOutput {
    return layoutStrategies[input.mode](input.data)
  },

  resolveHandles,
}
