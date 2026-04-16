import { useState, useEffect, useMemo } from 'react'
import { API_GRAPH } from '@/config/apiConfig'

export type EntityType = 'person' | 'company' | 'country'

export interface CausalNode {
  depth:      number
  id:         string
  label:      string
  type:       EntityType
  edgeLabel?: string
  edgeType?:  string
  children:   CausalNode[]
}

export interface CausalChainMeta {
  depthCounts:     number[]
  riskEdgeCount:   number
  totalNodes:      number
}

interface RawNode { id: string; label?: string; type?: string }
interface RawEdge { source: string; target: string; edgeType?: string; label?: string; openTimelineCount?: number }
interface SubgraphResponse { nodes: RawNode[]; edges: RawEdge[] }

const CAUSAL_EDGE_TYPES = new Set([
  'influences', 'governs', 'regulates', 'sanctions',
  'dependson',  'owns',    'finances',  'sets',
  'supplies',   'manufactures', 'militaryconflict', 'exports',
])

function isCausal(edgeType?: string): boolean {
  return CAUSAL_EDGE_TYPES.has((edgeType ?? '').toLowerCase())
}

function buildTree(
  rootId: string, rootLabel: string, rootType: EntityType,
  nodes: RawNode[], edges: RawEdge[], maxDepth: number,
): { root: CausalNode; meta: CausalChainMeta } {
  const nodeMap = new Map<string, RawNode>(nodes.map(n => [n.id, n]))
  const depthCounts = Array(maxDepth).fill(0)
  let riskEdgeCount = 0
  const adj = new Map<string, RawEdge[]>()
  for (const e of edges) {
    if (!isCausal(e.edgeType)) continue
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e)
    if ((e.openTimelineCount ?? 0) > 0) riskEdgeCount++
  }
  const visited = new Set<string>([rootId])
  function expand(nodeId: string, depth: number): CausalNode[] {
    if (depth > maxDepth) return []
    const outgoing = adj.get(nodeId) ?? []
    return outgoing
      .filter(e => !visited.has(e.target))
      .map(e => {
        visited.add(e.target)
        const raw  = nodeMap.get(e.target)
        const type = (raw?.type?.toLowerCase() ?? 'company') as EntityType
        if (depth <= maxDepth) depthCounts[depth - 1] = (depthCounts[depth - 1] ?? 0) + 1
        return {
          depth, id: e.target, label: raw?.label ?? e.target, type,
          edgeLabel: e.label ?? e.edgeType ?? undefined,
          edgeType:  e.edgeType ?? undefined,
          children:  expand(e.target, depth + 1),
        }
      })
  }
  const root: CausalNode = { depth: 0, id: rootId, label: rootLabel, type: rootType, children: expand(rootId, 1) }
  return { root, meta: { depthCounts, riskEdgeCount, totalNodes: visited.size } }
}

export function usePersonCausalChain(personId: string | null, depth = 3) {
  const [subgraph, setSubgraph] = useState<SubgraphResponse | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!personId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${API_GRAPH}/graph/node/${personId}/subgraph?depth=${depth}`)
      .then(r => { if (!r.ok) throw new Error(`Subgraph ${r.status}`); return r.json() })
      .then(d  => { if (!cancelled) setSubgraph(d) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [personId, depth])

  const result = useMemo(() => {
    if (!subgraph || !personId) return null
    const rootRaw = (subgraph.nodes ?? []).find(n => n.id === personId)
    return buildTree(personId, rootRaw?.label ?? personId, 'person', subgraph.nodes ?? [], subgraph.edges ?? [], depth)
  }, [subgraph, personId, depth])

  return { root: result?.root ?? null, meta: result?.meta ?? null, loading, error }
}
