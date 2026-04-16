import { useState, useEffect, useCallback } from 'react'
import { companyMarketsService, type CompanyMarket } from '@/services/companyMarketsService'

interface UseCompanyMarketsProps {
  companyId: number | null
  enabled?: boolean
  debug?: boolean
}

interface UseCompanyMarketsReturn {
  markets: CompanyMarket[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isEmpty: boolean
}

export function useCompanyMarkets({
  companyId,
  enabled = true,
  debug = false,
}: UseCompanyMarketsProps): UseCompanyMarketsReturn {
  const [markets, setMarkets] = useState<CompanyMarket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !companyId) { setMarkets([]); setError(null); return }
    const fetchMarkets = async () => {
      setLoading(true)
      setError(null)
      if (debug) console.log(`useCompanyMarkets: Fetching markets for company ${companyId}`)
      try {
        const data = await companyMarketsService.getByCompanyId(companyId)
        if (debug) console.log(`useCompanyMarkets: Received ${data.length} markets`, data)
        setMarkets(data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('useCompanyMarkets: Error fetching markets:', errorMessage)
        setError(errorMessage)
        setMarkets([])
      } finally {
        setLoading(false)
      }
    }
    fetchMarkets()
  }, [companyId, enabled, debug])

  const refetch = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await companyMarketsService.getByCompanyId(companyId)
      setMarkets(data)
      setError(null)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refetch markets'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  return { markets, loading, error, refetch, isEmpty: markets.length === 0 }
}
