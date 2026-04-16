import { useState, useEffect } from 'react'
import { companyFabricService } from '@/services/companyFabricService'
import type { CompanyFabric } from '@/types/companyFabric'

export function useCompanyFabrics(companyId: number | null) {
  const [fabrics, setFabrics] = useState<CompanyFabric[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (companyId === null) { setFabrics([]); setLoading(false); setError(null); return }
    const doFetch = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await companyFabricService.getByCompanyId(companyId)
        setFabrics(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading fabrics')
      } finally {
        setLoading(false)
      }
    }
    doFetch()
  }, [companyId])

  return { fabrics, loading, error }
}
