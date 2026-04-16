/** Matches C# CompositeIndexSnapshot (camelCase via ASP.NET default) */
export interface CompositeIndexSnapshot {
  id: number
  indexName: string
  domain: string
  impProbability: number
  polymarketProbability: number | null
  divergence: number | null
  divergenceSignal: boolean
  contributingMachines: string | null
  computedAt: string
}
