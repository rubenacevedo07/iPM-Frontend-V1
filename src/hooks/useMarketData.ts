import { useState, useEffect, useCallback } from 'react'
import { API_COMPANIES } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'

export interface MarketDataItem {
  id: number
  symbolId: number
  symbol: string
  price: number
  priceOpen: number | null
  priceHigh: number | null
  priceLow: number | null
  previousClose: number | null
  changeAbs: number | null
  changePct: number | null
  volume: number | null
  marketCap: number | null
  provider: number
  fetchedAt: string
  marketDate: string | null
  isDelayed: boolean
  delayMinutes: number | null
}

export function useMarketData(refreshIntervalMs: number = 60000) {
  const [data, setData] = useState<MarketDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const items = await apiClient.get<MarketDataItem[]>(`${API_COMPANIES}/market-data/latest`)
      setData(items)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch market data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshIntervalMs)
    return () => clearInterval(interval)
  }, [fetchData, refreshIntervalMs])

  return { data, loading, error, refetch: fetchData }
}
