import { useState, useEffect } from 'react'
import type { CashFlowResponse } from '@/types/alphaCashFlow'
import { cashFlowService } from '@/services/alphaCashFlowService'

export function useAlphaCashFlow(symbol: string) {
  const [data, setData] = useState<CashFlowResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    cashFlowService
      .getBySymbol(symbol)
      .then(setData)
      .catch((err: Error) => {
        console.error('useCashFlow:', err)
        setError(err.message ?? 'Failed to load cash flow')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [symbol])

  return { data, loading, error }
}
