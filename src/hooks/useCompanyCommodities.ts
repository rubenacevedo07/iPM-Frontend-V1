import { useState, useEffect } from 'react'
import { companyCommodityService } from '@/services/companyCommodityService'
import type { CompanyCommodity } from '@/types/companyCommodity'

export function useCompanyCommodities(companyId: number | null) {
  const [commodities, setCommodities] = useState<CompanyCommodity[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) { setCommodities([]); return }
    setLoading(true)
    setError(null)
    companyCommodityService
      .getByCompanyId(companyId)
      .then(data => { setCommodities(data) })
      .catch((err: Error) => {
        console.error('useCompanyCommodities:', err)
        setError(err.message ?? 'Failed to load commodities')
        setCommodities([])
      })
      .finally(() => setLoading(false))
  }, [companyId])

  return { commodities, loading, error }
}
