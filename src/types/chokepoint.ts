/** Matches C# CommodityChokepoint model (camelCase via ASP.NET default) */
export interface CommodityChokepoint {
  id: number
  name: string
  region: string
  controlledBy: string
  threatLevel: number
  closureRisk: number
  gdpImpactPercent: number | null
  dailyOilFlowMbd: number | null
  isActive: boolean
  notes: string | null
}

/** Risk summary from /api/chokepoints/risk-summary — matches anonymous projection */
export interface ChokepointRiskSummary {
  id: number
  name: string
  region: string
  controlledBy: string
  threatLevel: number
  closureRisk: number
  gdpImpactPercent: number | null
  dailyOilFlowMbd: number | null
  isActive: boolean
}
