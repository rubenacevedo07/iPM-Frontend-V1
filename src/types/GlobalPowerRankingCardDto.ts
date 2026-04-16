export interface GlobalPowerRankingCardDto {
  id: number
  personId: number
  compositeScore: number
  globalRank: number
  archetypeCode: string
  archetypeRank: number | null
  fpi: number | null
  mpi: number | null
  spi: number | null
  cpi: number | null
  ppi: number | null
  ipi: number | null
  reachMetricA: number | null
  reachMetricB: number | null
  reachMetricC: number | null
  reachMetricD: number | null
  computedAt: string
  person: {
    id: number
    fullName: string
    title: string | null
    photoUrl: string | null
  } | null

  // Derived fields (mapped by grid/card from raw data)
  rank: number
  name: string
  entityType: 'PERSON' | 'COUNTRY' | 'COMPANY'
  scoreDelta: number | null
  ideologyLabel: string
  ideologyIntensity: number
  metricA: number | null
  metricB: number | null
  metricC: number | null
  updatedAt: string
}
