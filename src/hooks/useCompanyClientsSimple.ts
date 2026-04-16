import { useState, useEffect } from 'react'
import { companyClientSimpleService } from '@/services/companyClientSimpleService'
import type { CompanyClientSimple } from '@/types/companyClientSimple'

export function useCompanyClientsSimple(companyId: number | null) {
  const [clients, setClients] = useState<CompanyClientSimple[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (companyId === null) { setClients([]); setLoading(false); setError(null); return }
    const doFetch = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await companyClientSimpleService.getByCompanyId(companyId)
        setClients(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading clients')
      } finally {
        setLoading(false)
      }
    }
    doFetch()
  }, [companyId])

  return { clients, loading, error }
}
