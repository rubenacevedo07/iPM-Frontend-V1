import { useState, useEffect } from 'react'
import { companySectorService } from '@/services/companySectorService'
import type { CompanySector } from '@/types/companySector'

export function useCompanySectors(companyId: number | null) {
  const [sectors, setSectors] = useState<CompanySector[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) { setSectors([]); setLoading(false); setError(null); return }
    setLoading(true)
    setError(null)
    companySectorService
      .getByCompanyId(companyId)
      .then(data => setSectors(data))
      .catch((err: Error) => {
        console.error('useCompanySectors:', err)
        setError(err.message ?? 'Failed to load sectors')
        setSectors([])
      })
      .finally(() => setLoading(false))
  }, [companyId])

  return { sectors, loading, error }
}
