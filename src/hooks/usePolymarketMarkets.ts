import { useState, useEffect } from 'react'
import { polymarketService } from '@/services/polymarketService'
import type { PolymarketMarket } from '@/types/polymarket'

export function usePolymarketMarkets() {
  const [markets, setMarkets]  = useState<PolymarketMarket[]>([])
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState<string | null>(null)
  const [nextCursor, setNext]  = useState<string | undefined>()

  function load(cursor?: string) {
    setLoading(true)
    setError(null)
    polymarketService.getMarkets(cursor)
      .then(res => {
        setMarkets(prev => cursor ? [...prev, ...res.data] : res.data)
        setNext(res.next_cursor)
      })
      .catch(e => setError((e as Error)?.message ?? 'Failed to fetch markets'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return {
    markets, loading, error,
    hasMore: !!nextCursor,
    loadMore: () => nextCursor && load(nextCursor),
  }
}
