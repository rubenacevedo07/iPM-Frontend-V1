import { useState, useEffect } from 'react'
import { compositeRiskIndexService } from '@/services/compositeRiskIndexService'
import type { CompositeIndexSnapshot } from '@/types/compositeRiskIndex'

export function useCompositeRiskIndex() {
  const [latest, setLatest] = useState<CompositeIndexSnapshot[]>([])
  const [gcri, setGcri] = useState<CompositeIndexSnapshot | null>(null)
  const [dsi, setDsi] = useState<CompositeIndexSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      compositeRiskIndexService.getLatest(),
      compositeRiskIndexService.getGcri(),
      compositeRiskIndexService.getDsi(),
    ])
      .then(([l, g, d]) => { setLatest(l); setGcri(g); setDsi(d) })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { latest, gcri, dsi, loading, error }
}
