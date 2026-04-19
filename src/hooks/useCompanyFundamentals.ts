/**
 * useCompanyFundamentals — fetches company fundamentals for a ticker symbol.
 *
 * Returns null data if symbol is null/empty (e.g. private companies).
 * Backend caches 168hr, so after first call per company this is very cheap.
 */

import { useState, useEffect } from 'react'
import { alphaVantageService } from '@/services/alphaVantageService'
import type { CompanyFundamentalsDto } from '@/types/companyFundamentals'

export function useCompanyFundamentals(symbol: string | null | undefined) {
  const [data, setData]       = useState<CompanyFundamentalsDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!symbol) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    alphaVantageService
      .getOverview(symbol)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [symbol])

  return { data, loading, error }
}
