export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  born?: string | null;
  citizenship?: string | null;
  education?: string | null;
  knownFor?: string | null;
  title?: string | null;
  xUrl?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  companyId?: number | null;
  companyName?: string | null;
  companyLogo?: string | null;
  countryId?: number | null;
  countryName?: string | null;
  countryLat?: number | null;
  countryLng?: number | null;
  nodeId?: string | null;
}

export interface PersonSummary {
  id: number;
  name: string;
  lastName: string;
}

// ── PersonIntelligence DTOs ──────────────────────────────────────────────────

export interface IdeologyProfile {
  id: number
  entityType: string
  entityId: number
  econScore: number
  authScore: number
  culturalScore: number
  genderScore: number
  geoScore: number
  envScore: number
  religionScore: number
  labelPrimary: string | null
  labelTags: string[]
  validFrom: string
  validTo: string | null
  confidence: number
  sourceUrl: string | null
  notes: string | null
}

export interface PersonAssetBreakdown {
  companyId: number
  companyName: string
  ticker: string | null
  stakePercent: number | null
  estimatedValueUsd: number | null
  edgeStrength: string
}

export interface PersonWealth {
  id: number
  netWorthUsd: number
  wealthRank: number | null
  wealthSource: string | null
  liquidityPct: number | null
  primaryCompanyId: number | null
  valuationDate: string
  valuationYear: number
  wealthBreakdown: Record<string, number> | null
  notes: string | null
  sourceUrl: string | null
  assetBreakdown: PersonAssetBreakdown[]
}

export interface PersonCompany {
  companyId: number
  name: string
  ticker: string | null
  description: string | null
  edgeType: string
  strength: string
  edgeLabel: string | null
  stakePercent: number | null
  countryId: number | null
  countryName: string | null
  sectorId: number | null
  sectorName: string | null
  isChokepoint: boolean
  softwareDependencyScore: number | null
  systemicImportanceLevel: string | null
}

export interface PersonFacility {
  facilityId: number
  name: string
  facilityType: string | null   // maps Facilities."Type" — HQ/Gigafactory/Manufacturing/Fab/DataCenter/R&D/Refinery/Logistics
  companyId: number
  companyName: string
  countryId: number | null
  countryName: string | null
  city: string | null
  description: string | null    // maps Facilities."Description"
  employees: number | null      // maps Facilities."Employees"
  latitude: number | null       // maps Facilities."Latitude" — globe pin placement
  longitude: number | null      // maps Facilities."Longitude" — globe pin placement
  isStrategic: boolean          // maps Facilities."IsStrategic" — drives visual priority
}

export interface PersonRiskProfile {
  id: number
  dimensionName: string
  dimensionCategory: 'POWER' | 'VULNERABILITY'
  score: number
  scoreLabel: string | null
  description: string | null
  relatedEntityType: string | null
  relatedEntityId: number | null
  reportDate: string
  sourceUrl: string | null
}

export interface PersonSector {
  sectorId: number
  sectorName: string
  sectorCode: string
  sectorCategory: string
  isPrimary: boolean
  companyId: number
  companyName: string
}

export interface SupplyChainLink {
  commodityName: string
  commodityCategory: string | null
  originCountry: string | null
  supplyRiskScore: number | null
  facilityName: string
  facilityType: string | null
  facilityCity: string | null
  companyName: string
  dependencyLevel: string
  usageType: string
}

// ── PersonPowerIndex — IPM computed 6-axis scores + reach metrics ────────────
// .NET 8 CamelCase serialises all-uppercase props to lowercase: FPI → fpi

export interface PersonPowerIndex {
  id: number
  personId: number
  compositeScore: number
  globalRank: number | null
  archetypeCode: string
  fpi: number | null        // FinancialScore
  mpi: number | null        // MilitaryScore
  spi: number | null        // SoftwareScore
  cpi: number | null        // CommodityScore
  ppi: number | null        // PoliticalScore
  ipi: number | null        // InformationScore
  reachMetricA: number | null  // EstimatedAumUsd
  reachMetricB: number | null  // EstimatedPopulationGoverned
  reachMetricC: number | null  // EstimatedGdpControlledUsd
  reachMetricD: number | null  // EstimatedEmployeesReached
  archetypeRank: number | null
  computedAt: string
}

// ── PersonVision — strategic vision & objectives ──────────────────────────────

export interface PersonVision {
  id: number
  personId: number
  visionArchetype: string | null
  visionSummary: string | null
  declaredObjectives: Array<{
    goal: string
    target_date: string
    metric: string
    status: string
  }> | null
  visionStatements: Array<{
    quote: string
    source: string
    date: string
    context: string
  }> | null
  divergenceFlags: Array<{
    stated: string
    observed: string
    severity: 'High' | 'Med' | 'Low'
  }> | null
  statedTimeHorizon: string | null
  confidenceScore: number | null
  isVerified: boolean
  sourceCount: number
  collectedAt: string
}

export interface PersonIntelligence {
  id: number
  fullName: string | null
  title: string | null
  photoUrl: string | null
  description: string | null
  categoryCode: string | null
  pepFlag: boolean
  influenceDomain: string | null
  nationalityCountry: string | null
  nodeId: string
  ideology: IdeologyProfile | null
  wealth: PersonWealth | null
  powerScores: PersonRiskProfile[]
  vulnerabilities: PersonRiskProfile[]
  sectors: PersonSector[]
  supplyChain: SupplyChainLink[]
  partyName: string | null
  partyAbbrev: string | null
  roleInParty: string | null
  powerMapId: number | null
  powerMapElements: number
  powerMapEdges: number
}
