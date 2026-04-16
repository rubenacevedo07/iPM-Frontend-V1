import { useState, useEffect } from 'react'
import { companyCommodityService } from '@/services/companyCommodityService'
import type { CompanyCommodity } from '@/types/companyCommodity'

export function useCompanyCommoditiesByCommodity(commodityId: number | null) {
  const [companyCommodities, setCompanyCommodities] = useState<CompanyCommodity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (commodityId == null) { setCompanyCommodities([]); return }
    setLoading(true)
    setError(null)
    companyCommodityService
      .getByCommodityId(commodityId)
      .then(setCompanyCommodities)
      .catch((err: Error) => {
        console.error('useCompanyCommoditiesByCommodity:', err)
        setError(err.message ?? 'Failed to load company commodities')
        setCompanyCommodities([])
      })
      .finally(() => setLoading(false))
  }, [commodityId])

  return { companyCommodities, loading, error }
}
