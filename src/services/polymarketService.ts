import type { PolymarketMarket, PolymarketOrderBook } from '@/types/polymarket'

const CLOB_HOST  = "https://clob.polymarket.com"
const GAMMA_HOST = "/polymarket"

export interface MarketsResponse {
  data: PolymarketMarket[]
  next_cursor?: string
}

export const polymarketService = {
  async getMarkets(nextCursor?: string): Promise<MarketsResponse> {
    const qs = nextCursor ? `?next_cursor=${encodeURIComponent(nextCursor)}` : ''
    const res = await fetch(`${GAMMA_HOST}/markets${qs}`)
    if (!res.ok) throw new Error(`Polymarket error: ${res.status} ${res.statusText}`)
    const raw = await res.json()
    return {
      data:        (Array.isArray(raw) ? raw : (raw.data ?? [])) as PolymarketMarket[],
      next_cursor: raw.next_cursor,
    }
  },

  async getMarket(conditionId: string): Promise<PolymarketMarket | null> {
    const res = await fetch(`${GAMMA_HOST}/markets?condition_ids=${conditionId}`)
    if (!res.ok) throw new Error(`Market not found: ${conditionId}`)
    const raw = await res.json()
    return (Array.isArray(raw) ? raw[0] : raw) as PolymarketMarket ?? null
  },

  async getOrderBook(tokenId: string): Promise<PolymarketOrderBook | null> {
    try {
      const res = await fetch(`${CLOB_HOST}/book?token_id=${encodeURIComponent(tokenId)}`)
      if (!res.ok) return null
      return res.json() as Promise<PolymarketOrderBook>
    } catch {
      return null
    }
  },
}
