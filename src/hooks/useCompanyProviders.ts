import { useState, useEffect } from 'react'
import { companyProviderService } from '@/services/companyProviderService'
import type { CompanyProvider } from '@/types/companyProvider'

export function useCompanyProviders(companyId: number | null) {
  const [providers, setProviders] = useState<CompanyProvider[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) { setProviders([]); return }
    setLoading(true)
    setError(null)
    companyProviderService
      .getByCompanyId(companyId)
      .then(setProviders)
      .catch((err: Error) => {
        console.error('useCompanyProviders:', err)
        setError(err.message ?? 'Failed to load providers')
        setProviders([])
      })
      .finally(() => setLoading(false))
  }, [companyId])

  return { providers, loading, error }
}
