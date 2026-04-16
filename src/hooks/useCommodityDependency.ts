import { useState, useEffect } from 'react'
import { commodityDependencyService } from '@/services/commodityDependencyService'
import type { CompanyRiskProfile } from '@/types/commodityDependency'

export function useCommodityDependencyCompany(companyId: number | null) {
  const [company, setCompany]   = useState<CompanyRiskProfile | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (companyId == null) { setCompany(null); return }
    setLoading(true)
    setError(null)
    commodityDependencyService
      .getCompanyById(companyId)
      .then(setCompany)
      .catch((err: Error) => {
        console.error('useCommodityDependencyCompany:', err)
        setError(err.message ?? 'Failed to load risk profile')
        setCompany(null)
      })
      .finally(() => setLoading(false))
  }, [companyId])

  return { company, loading, error }
}
