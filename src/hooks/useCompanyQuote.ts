/**
 * useCompanyQuote — fetches live price quote for a ticker symbol.
 *
 * Returns null data if symbol is null/empty (e.g. private companies,
 * facilities, government entities without a public ticker).
 * Backend caches 60min, so rapid re-calls are cheap.
 *
 * Pattern matches useEntityNews.ts (inline useState/useEffect, not useService
 * because the enabled predicate depends on `symbol` string truthiness rather
 * than a numeric id).
 */

import { useState, useEffect } from 'react'
import { alphaVantageService } from '@/services/alphaVantageService'
import type { MarketQuoteDto } from '@/types/marketQuote'

export function useCompanyQuote(symbol: string | null | undefined) {
  const [data, setData]       = useState<MarketQuoteDto | null>(null)
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
      .getQuote(symbol)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [symbol])

  return { data, loading, error }
}
