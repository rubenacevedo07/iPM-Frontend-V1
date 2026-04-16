import { useState, useEffect } from 'react'
import { chokepointService } from '@/services/chokepointService'
import type { CommodityChokepoint, ChokepointRiskSummary } from '@/types/chokepoint'

export function useChokepoints() {
  const [chokepoints, setChokepoints] = useState<CommodityChokepoint[]>([])
  const [riskSummary, setRiskSummary] = useState<ChokepointRiskSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      chokepointService.getAll(),
      chokepointService.getRiskSummary(),
    ])
      .then(([c, r]) => { setChokepoints(c); setRiskSummary(r) })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { chokepoints, riskSummary, loading, error }
}
