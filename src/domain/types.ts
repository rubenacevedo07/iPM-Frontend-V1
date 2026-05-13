// ── Entity ──
export type EntityType = 'PERSON' | 'COMPANY' | 'COUNTRY' | 'COMMODITY'

export interface EntityRef {
  id: number
  nodeId: string        // "person:7", "company:12"
  type: EntityType
  slug: string
  name: string
}

export interface PersonEntity extends EntityRef {
  type: 'PERSON'
  title: string | null
  photo: string | null
  compositeScore: number | null
  globalRank: number | null
  archetypeCode: string | null
}

export interface CompanyEntity extends EntityRef {
  type: 'COMPANY'
  ticker: string | null
  marketCap: number | null
  revenue: number | null
  employees: number | null
  sector: string | null
  isChokepoint: boolean
}

// ── Relations ──
export type RelationType =
  | 'Supplies' | 'Manufactures' | 'Distributes' | 'DependsOn'
  | 'Finances' | 'Owns' | 'Regulates' | 'Sanctions'
  | 'Influences' | 'Governs' | 'Competes' | 'Partners'
  | 'Exports' | 'MilitaryConflict' | 'Sets'

export type RelationStrength = 'Critical' | 'High' | 'Medium' | 'Low'
export type Severity = 'critical' | 'high' | 'medium' | 'low'

// ── Graph ──
export type NodeType = 'person' | 'company' | 'country' | 'theme' | 'scenario' | 'org'

export interface GraphNode {
  id: string
  label: string
  name: string
  type: NodeType
  r: number
  central?: boolean
  priority: number
}

export interface GraphEdge {
  source: string
  target: string
  type: string
  strength: RelationStrength
}

// ── Person Intelligence (API response shape) ──
export interface IdeologyScore {
  dimension: string
  score: number
  label: string
}

export interface IdeologyProfile {
  econScore: number | null
  authScore: number | null
  culturalScore: number | null
  geoScore: number | null
  genderScore: number | null
  envScore: number | null
  religionScore: number | null
  labelTags: string[]
}

export interface PersonWealth {
  netWorthUsd: number | null
  wealthRank: number | null
  wealthSource: string | null
}

export interface PowerDimension {
  dimensionName: string
  score: number
}

export interface PersonRiskProfile {
  category: 'POWER' | 'VULNERABILITY'
  dimensionName: string
  score: number
  severity: Severity
}

export interface PersonSector {
  sectorName: string
  isPrimary: boolean
  exposure: number
}

export interface SupplyChainLink {
  entityName: string
  entityType: string
  dependency: string
  risk: Severity
}

export interface PersonIntelligence {
  id: number
  fullName: string | null
  firstName: string | null
  lastName: string | null
  title: string | null
  photoUrl: string | null
  nodeId: string
  archetypeCode: string | null
  compositeScore: number | null
  globalRank: number | null
  influenceDomain: string | null
  ideology: IdeologyProfile | null
  wealth: PersonWealth | null
  powerScores: PowerDimension[]
  vulnerabilities: PersonRiskProfile[]
  sectors: PersonSector[]
  supplyChain: SupplyChainLink[]
  powerMapId: number | null
}

// ── Company Intelligence ──
export interface CompanyKeyPerson {
  personId:   number
  name:       string
  role:       string
  powerScore: number | null
}

export interface CompanyClient {
  name:        string
  nodeId:      string | null
  revenueShare: number | null   // 0-100%
  dependency:  'Critical' | 'High' | 'Medium' | 'Low'
}

export interface CompanySupplier {
  name:            string
  nodeId:          string | null
  component:       string
  substitutionLatencyMonths: number
  risk:            Severity
}

export interface CompanyFacility {
  name:    string
  country: string
  type:    'HQ' | 'Fab' | 'R&D' | 'Sales' | 'Manufacturing'
  lat:     number
  lng:     number
}

export interface CompanyProductLine {
  name:         string
  revenueShare: number   // 0-100%
  description:  string
  keyCustomers: string[]
}

export interface CompanyScenario {
  id:          string
  title:       string
  probability: number   // 0-100
  category:    string
  color:       string
  impacts:     string[]
}

export interface CompanySignal {
  id:          number
  headline:    string
  source:      string
  publishedAt: string
  severity:    Severity
}

export interface CompanyIntelligence {
  id:                     number
  name:                   string
  ticker:                 string | null
  marketCap:              number | null
  revenue:                number | null
  employees:              number | null
  sector:                 string | null
  isChokepoint:           boolean
  softwareDependencyScore: number | null
  logoUrl:                string | null
  description:            string | null
  keyPersons:             CompanyKeyPerson[]
  clients:                CompanyClient[]
  suppliers:              CompanySupplier[]
  facilities:             CompanyFacility[]
  productLines:           CompanyProductLine[]
  scenarios:              CompanyScenario[]
  signals:                CompanySignal[]
}

// ── Graph Neighbors (API response) ──
export interface NeighborNode {
  nodeId: string
  name: string
  type: NodeType
  compositeScore: number | null
  // Backend ships `Person.Photo` / `Company.Logo` here when available.
  // Format may be filename only (`Musk.jpeg`), relative path (`/persons/Musk.jpeg`),
  // or absolute URL. The graph-view adapter normalizes all three forms.
  photoUrl?: string | null
}

export interface NeighborEdge {
  sourceNodeId: string
  targetNodeId: string
  edgeType: string
  strength: RelationStrength
}

export interface NeighborsResponse {
  centralNodeId: string
  nodes: NeighborNode[]
  edges: NeighborEdge[]
}

// ── Relation Analysis ──
export interface RelationAnalysis {
  sourceEntity: string
  targetEntity: string
  relationType: RelationType
  strength: number
  riskScore: number
  description: string | null
  powerDynamic: string | null
  keyLevers: string[]
  riskFactors: string[]
}

// ── News / Signals ──
export interface Signal {
  id: number
  headline: string
  source: string
  publishedAt: string
  severity: Severity
  entityNodeIds: string[]
}

// ── Timeline ──
export interface TimelineCard {
  id: string
  title: string
  probability: number
  timeframe: string
  category: string
}

// ── Shared Connections ──
export interface SharedConnection {
  nodeId: string
  name: string
  type: NodeType
  relationToA: string
  relationToB: string
}

// ── Cascade Exposure ──
export interface CascadeExposure {
  totalExposed: number
  sectors: number
  countries: number
  maxHops: number
}

// ── Cinematic ──
export interface TransitionScene {
  image: string
  label: string
  subLabel?: string
}

// ── Market / Dashboard DTOs ──
export interface MarketDataCacheDto {
  symbol:       string
  label:        string | null
  price:        number
  changePct:    number | null
  changeAbs:    number | null
  updatedAt:    string
  isDelayed:    boolean
  dataNodeType: string | null
}

export interface MarketSymbolDto {
  symbol:      string
  label:       string
  dataNodeType: string
}

export interface CompositeIndexDto {
  code:       string    // 'GCRI' | 'DSI' | 'WPI'
  value:      number
  delta:      number
  trend:      'UP' | 'DOWN' | 'STABLE'
  computedAt: string
}

export interface RelationArcDto {
  sourceNodeId: string
  targetNodeId: string
  sourceLat:    number
  sourceLng:    number
  targetLat:    number
  targetLng:    number
  relationType: string
  strength:     'Critical' | 'High' | 'Medium' | 'Low'
  color:        [number, number, number, number]  // RGBA 0-255
}

export interface CountryRiskSummaryDto {
  isoCode:   string
  name:      string
  riskScore: number
  latitude:  number
  longitude: number
}

// ── Company API sub-types ──
export interface CompanyProvider {
  name:       string
  nodeId:     string | null
  component:  string
  riskScore:  number   // 0-100
  risk:       Severity
}

export interface CompanyOwnershipHolder {
  name:       string
  pct:        number   // 0-100
  type:       'institutional' | 'insider' | 'retail'
}

export interface CompanyTimeline {
  id:          string
  title:       string
  probability: number   // 0-100
  category:    string
  color:       string
  timeframe:   string
  description: string
}

export interface CompanyPerson {
  personId:    number
  name:        string
  role:        string
  nodeId:      string | null
  powerScore:  number | null
}

export interface CompanySector {
  sectorName:  string
  isPrimary:   boolean
  exposure:    number
}

export interface CompanyCommodity {
  commodityName:       string
  dependencyLevel:     'Critical' | 'High' | 'Medium' | 'Low'
  exposurePercentage:  number
}

// ── Search ──
export interface SearchResultDto {
  id:       number
  name:     string
  type:     'PERSON' | 'COMPANY' | 'COUNTRY'
  nodeId:   string
  slug:     string
  subtitle?: string   // title for persons, ticker for companies
  photoUrl?: string
  score?:    number   // composite/power score
}

// ── Power ranking ──
export interface PowerRankingDto {
  personId:       number
  fullName:       string
  title:          string | null
  archetypeCode:  string
  compositeScore: number
  globalRank:     number
  photoUrl:       string | null
  nodeId:         string
  slug:           string
}

// ── Active timelines ──
export interface ActiveTimelineDto {
  id:             string
  question:       string
  probA:          number      // 0-1
  divergenceType: string
  entityName:     string | null
}

// ── View enums ──
export type D1View = 'globe' | 'network' | 'force' | 'graph'
export type PersonTab = 'overview' | 'trader' | 'analyst' | 'predictions'
export type CompanyTab = 'overview' | 'products' | 'supplychain' | 'risk'
export type RelationTab = 'overview' | 'timelines' | 'network' | 'analysis'
export type GraphView = 'ego' | 'supply' | 'full'
