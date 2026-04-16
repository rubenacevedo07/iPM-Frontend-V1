import { useState, useEffect } from 'react'
import { countryTradeService } from '@/services/countryTradeService'
import type { CountryTrade } from '@/types/countryTrade'

export function useCountryTrades(countryId: number | null = null) {
  const [trades, setTrades] = useState<CountryTrade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const request = countryId
      ? countryTradeService.getByCountryId(countryId)
      : countryTradeService.getAll()
    request
      .then(setTrades)
      .catch((err: Error) => {
        console.error('useCountryTrades:', err)
        setError(err.message ?? 'Failed to load country trades')
        setTrades([])
      })
      .finally(() => setLoading(false))
  }, [countryId])

  return { trades, loading, error }
}
