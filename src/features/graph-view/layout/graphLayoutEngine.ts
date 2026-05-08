// src/features/graph-view/layout/graphLayoutEngine.ts
// Central graph layout abstraction. All node positioning, edge generation, and
// handle routing lives here. React Flow components remain layout-agnostic.
import type { Node, Edge } from '@xyflow/react'
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

// ── Internal orbital input types ─────────────────────────────────────────────
// Structurally compatible with GraphSubgraph (graphMapper.ts) — no import
// needed; TypeScript structural typing handles the cast at call sites.

interface OrbitalNode {
  NodeId:    string
  Label:     string
  Type:      'person' | 'company' | 'country'
  DbId?:     string
  Subtitle?: string
  Accent?:   GraphNodeAccent
  Avatar?:   string
  Score?:    string
}

interface OrbitalEdge {
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

interface OrbitalInput {
  center: OrbitalNode
  nodes:  OrbitalNode[]
  edges:  OrbitalEdge[]
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

// ── Orbital strategy implementation ──────────────────────────────────────────

function calculateOrbital(rawData: unknown): LayoutEngineOutput {
  const data = rawData as OrbitalInput

  // Build engine nodes (geometry only) for handle resolution
  const centerEngineNode: EngineNode = {
    id:       data.center.NodeId,
    rfType:   'center',
    position: { x: 382, y: 222 },
  }

  const ring1EngineNodes: EngineNode[] = data.nodes.map((n, i) => ({
    id:       n.NodeId,
    rfType:   'entity' as GraphNodeType,
    position: orbitPos(orbitAngle(i, data.nodes.length), ORBITAL_R1),
  }))

  const nodeMap = new Map<string, EngineNode>(
    [centerEngineNode, ...ring1EngineNodes].map(n => [n.id, n]),
  )

  // Build React Flow nodes
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

  // Build React Flow edges
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

// ── Strategy registry ─────────────────────────────────────────────────────────
// Object-based dispatch; add future engines here without touching any renderer.

const layoutStrategies: Record<LayoutMode, (data: unknown) => LayoutEngineOutput> = {
  'orbital':  calculateOrbital,
  'dagre-lr': calculateOrbital, // placeholder — replace when dagre is added
  'dagre-tb': calculateOrbital, // placeholder
  'force':    calculateOrbital, // placeholder
  'cluster':  calculateOrbital, // placeholder
}

// ── Public API ────────────────────────────────────────────────────────────────

export const layoutEngine = {
  calculate<T = unknown>(input: LayoutEngineInput<T>): LayoutEngineOutput {
    return layoutStrategies[input.mode](input.data)
  },

  resolveHandles,
}
