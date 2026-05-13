// Adapters: domain types (Rule 1 — `src/domain/types`) → view shapes
// (`Demo*` from personFallbackData) consumed by CompactProfilePanel.
// Lives at the service boundary; CompactProfilePanel stays untouched.

import type {
  NeighborEdge,
  NeighborNode,
  NeighborsResponse,
  RelationStrength,
  Severity,
  Signal,
} from '@/domain/types'
import type { DemoConnection, DemoSignal } from './personFallbackData'

const STRENGTH_COLOR: Record<RelationStrength, { ring: string; score: string }> = {
  Critical: { ring: '#00d4aa', score: '#00e5ff' },
  High:     { ring: '#00e5ff', score: '#00e5ff' },
  Medium:   { ring: '#f5a623', score: '#f5a623' },
  Low:      { ring: '#6b7a90', score: '#6b7a90' },
}

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#e53935',
  high:     '#e53935',
  medium:   '#f5a623',
  low:      '#00e5ff',
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ageFromIso(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const ms = Date.now() - then
  const h  = Math.floor(ms / 3_600_000)
  if (h < 1)   return 'now'
  if (h < 24)  return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 5)   return `${w}w`
  const mo = Math.floor(d / 30)
  return `${mo}mo`
}

/**
 * Build connection rows for one side of the StudioRelation. Joins NeighborsResponse
 * nodes with edges (looking up edge type & strength by sourceNodeId === central or
 * by either endpoint matching) and produces the view shape CompactProfilePanel
 * already understands.
 */
export function toConnections(
  res: NeighborsResponse | null | undefined,
  centralNodeId: string,
): DemoConnection[] {
  if (!res || !res.nodes?.length) return []

  const edgeByOther = new Map<string, NeighborEdge>()
  for (const e of res.edges ?? []) {
    const other =
      e.sourceNodeId === centralNodeId ? e.targetNodeId :
      e.targetNodeId === centralNodeId ? e.sourceNodeId : null
    if (other && !edgeByOther.has(other)) edgeByOther.set(other, e)
  }

  return res.nodes
    .filter(n => n.nodeId !== centralNodeId)
    .map((n: NeighborNode) => {
      const edge      = edgeByOther.get(n.nodeId)
      const strength  = edge?.strength ?? 'Medium'
      const palette   = STRENGTH_COLOR[strength]
      const edgeLabel = edge?.edgeType ?? 'Connected'
      return {
        initials:   toInitials(n.name),
        name:       n.name,
        role:       `${n.type} · ${edgeLabel}`,
        score:      n.compositeScore != null ? (n.compositeScore / 10).toFixed(1) : '—',
        color:      palette.ring,
        scoreColor: palette.score,
        nodeId:     n.nodeId,
      }
    })
}

/** API Signal[] → DemoSignal[] view rows. */
export function toSignals(signals: Signal[] | null | undefined): DemoSignal[] {
  if (!signals?.length) return []
  return signals.map((s: Signal) => ({
    src:   s.source,
    color: SEVERITY_COLOR[s.severity] ?? '#6b7a90',
    age:   ageFromIso(s.publishedAt),
    text:  s.headline,
  }))
}
