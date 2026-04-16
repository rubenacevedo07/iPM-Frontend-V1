import { useState, useEffect } from 'react'
import type { EarningsResponse } from '@/types/alphaEarnings'
import { alphaEarningsService } from '@/services/alphaEarningsService'

export function useEarnings(symbol: string) {
  const [data, setData] = useState<EarningsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    alphaEarningsService
      .getBySymbol(symbol)
      .then(setData)
      .catch((err: Error) => {
        console.error('useEarnings:', err)
        setError(err.message ?? 'Failed to load earnings')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [symbol])

  return { data, loading, error }
}
