import { useState, useEffect } from 'react'
import { polymarketService } from '@/services/polymarketService'
import type { PolymarketOrderBook } from '@/types/polymarket'

export function usePolymarketOrderBook(tokenId: string | null) {
  const [orderBook, setOrderBook] = useState<PolymarketOrderBook | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!tokenId) { setOrderBook(null); return }
    setLoading(true)
    setError(null)
    polymarketService.getOrderBook(tokenId)
      .then(setOrderBook)
      .catch(e => setError((e as Error)?.message ?? 'Failed to fetch order book'))
      .finally(() => setLoading(false))
  }, [tokenId])

  return { orderBook, loading, error }
}
