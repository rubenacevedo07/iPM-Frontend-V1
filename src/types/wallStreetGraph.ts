export type RelevanceTier = 1 | 2 | 3

export interface WallStreetNodeData extends Record<string, unknown> {
  entityId: string
  entityType: string
  entitySubtype: string | null
  canonicalName: string
  aliasNames: string[]
  slug: string | null
  wikiSlug: string | null
  countryNodeId: string | null
  parentNodeId: string | null
  lat: number | null
  lng: number | null
  relevanceTier: RelevanceTier
  clusterIds: string[]
  primaryClusterColor: string
  modelCount: number
  models: string[]
}

export interface WallStreetEdgeData extends Record<string, unknown> {
  edgeType: string
  edgeSubtype: string | null
  validFrom: string
  validTo: string | null
  isTemporalPending: boolean
  label: string | null
  truthState: string
  strengthLabel: string | null
  strengthValue: number | null
  magnitude: number | null
  magnitudeUnit: string | null
  dependencyScore: number | null
  influenceScore: number | null
  formalityScore: number | null
  reversibilityScore: number | null
  confidenceScore: number | null
  notes: string | null
  primaryColor: string
}

export interface WallStreetCluster {
  id: string
  name: string
  color: string
  description: string
  nodeIds: string[]
  nodeCount: number
  defaultVisible: boolean
}

export interface WallStreetRawEdge {
  id: string
  source: string
  target: string
  data: WallStreetEdgeData
}

export interface WallStreetMetadata {
  graph_name: string
  node_count: number
  edge_count: number
  tier_distribution: Record<string, number>
}

export interface WallStreetViewDefaults {
  initialTierFilter: number
  minStrengthVisible: number
  showTemporalPending: boolean
}

export interface WallStreetData {
  metadata: WallStreetMetadata
  viewDefaults: WallStreetViewDefaults
  clusters: WallStreetCluster[]
  nodes: WallStreetNodeData[]
  rawEdges: WallStreetRawEdge[]
}
