import { useEffect, useState } from 'react'
import type {
  WallStreetData,
  WallStreetNodeData,
  WallStreetCluster,
  WallStreetRawEdge,
  WallStreetEdgeData,
  RelevanceTier,
} from '@/types/wallStreetGraph'

const FALLBACK_COLOR = '#94a3b8'

interface RawCluster {
  id: string
  name: string
  color: string
  description: string
  node_ids: string[]
  node_count: number
  default_visible: boolean
}

interface RawNode {
  id: string
  entity_type: string
  entity_subtype: string | null
  canonical_name: string
  alias_names: string[]
  slug: string | null
  wiki_slug: string | null
  country_node_id: string | null
  parent_node_id: string | null
  lat: number | null
  lng: number | null
  relevance_tier: number
  cluster_ids: string[]
  model_count: number
  models: string[]
}

interface RawEdge {
  id: string
  source: string
  target: string
  edge_type: string
  edge_subtype: string | null
  valid_from: string
  valid_to: string | null
  is_temporal_pending: boolean
  label: string | null
  truth_state: string
  strength_label: string | null
  strength_value: number | null
  magnitude: number | null
  magnitude_unit: string | null
  dependency_score: number | null
  influence_score: number | null
  formality_score: number | null
  reversibility_score: number | null
  confidence_score: number | null
  notes: string | null
  model_count: number
  models: string[]
}

interface RawJson {
  metadata: {
    graph_name: string
    node_count: number
    edge_count: number
    tier_distribution: Record<string, number>
  }
  view_defaults: {
    initial_tier_filter: number
    min_strength_visible: number
    show_temporal_pending: boolean
  }
  clusters: RawCluster[]
  nodes: RawNode[]
  edges: RawEdge[]
}

function clampTier(t: number): RelevanceTier {
  if (t === 1 || t === 2 || t === 3) return t
  return 3
}

function transform(raw: RawJson): WallStreetData {
  const clusters: WallStreetCluster[] = raw.clusters.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color,
    description: c.description,
    nodeIds: c.node_ids,
    nodeCount: c.node_count,
    defaultVisible: c.default_visible,
  }))

  const clusterColorById = new Map<string, string>()
  for (const c of clusters) clusterColorById.set(c.id, c.color)

  const nodes: WallStreetNodeData[] = raw.nodes.map(n => {
    const primaryClusterId = n.cluster_ids[0]
    const primaryClusterColor =
      (primaryClusterId && clusterColorById.get(primaryClusterId)) || FALLBACK_COLOR
    return {
      entityId: n.id,
      entityType: n.entity_type,
      entitySubtype: n.entity_subtype,
      canonicalName: n.canonical_name,
      aliasNames: n.alias_names ?? [],
      slug: n.slug,
      wikiSlug: n.wiki_slug,
      countryNodeId: n.country_node_id,
      parentNodeId: n.parent_node_id,
      lat: n.lat,
      lng: n.lng,
      relevanceTier: clampTier(n.relevance_tier),
      clusterIds: n.cluster_ids ?? [],
      primaryClusterColor,
      modelCount: n.model_count,
      models: n.models ?? [],
    }
  })

  const nodeColorById = new Map<string, string>()
  for (const n of nodes) nodeColorById.set(n.entityId, n.primaryClusterColor)

  const rawEdges: WallStreetRawEdge[] = raw.edges.map(e => {
    const data: WallStreetEdgeData = {
      edgeType: e.edge_type,
      edgeSubtype: e.edge_subtype,
      validFrom: e.valid_from,
      validTo: e.valid_to,
      isTemporalPending: e.is_temporal_pending,
      label: e.label,
      truthState: e.truth_state,
      strengthLabel: e.strength_label,
      strengthValue: e.strength_value,
      magnitude: e.magnitude,
      magnitudeUnit: e.magnitude_unit,
      dependencyScore: e.dependency_score,
      influenceScore: e.influence_score,
      formalityScore: e.formality_score,
      reversibilityScore: e.reversibility_score,
      confidenceScore: e.confidence_score,
      notes: e.notes,
      primaryColor: nodeColorById.get(e.source) ?? FALLBACK_COLOR,
    }
    return { id: e.id, source: e.source, target: e.target, data }
  })

  return {
    metadata: {
      graph_name: raw.metadata.graph_name,
      node_count: raw.metadata.node_count,
      edge_count: raw.metadata.edge_count,
      tier_distribution: raw.metadata.tier_distribution,
    },
    viewDefaults: {
      initialTierFilter: raw.view_defaults.initial_tier_filter,
      minStrengthVisible: raw.view_defaults.min_strength_visible,
      showTemporalPending: raw.view_defaults.show_temporal_pending,
    },
    clusters,
    nodes,
    rawEdges,
  }
}

export interface UseWallStreetDataResult {
  data: WallStreetData | null
  isLoading: boolean
  error: Error | null
}

export function useWallStreetData(): UseWallStreetDataResult {
  const [state, setState] = useState<UseWallStreetDataResult>({
    data: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    fetch('/data/wall_street_frontend_v1.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load graph data (HTTP ${res.status})`)
        return res.json() as Promise<RawJson>
      })
      .then(raw => {
        if (cancelled) return
        setState({ data: transform(raw), isLoading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ data: null, isLoading: false, error })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
