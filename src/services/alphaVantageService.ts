/**
 * alphaVantageService.ts — client for /api/AlphaVantage endpoints.
 *
 * Backend handles Alpha Vantage rate-limiting + caching (60min quote,
 * 168hr overview). Frontend hooks treat responses as cheap; repeated
 * calls within a cache window hit backend memory/cache, not the paid API.
 *
 * Pattern matches newsEventService.ts (uses API_GRAPH + apiClient.get).
 */

import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'
import type { MarketQuoteDto } from '@/types/marketQuote'
import type { CompanyFundamentalsDto } from '@/types/companyFundamentals'

const BASE = `${API_GRAPH}/AlphaVantage`

export const alphaVantageService = {
  /** GET /api/AlphaVantage/quote/{symbol} — live quote (60min backend cache). */
  getQuote: (symbol: string) =>
    apiClient.get<MarketQuoteDto>(`${BASE}/quote/${encodeURIComponent(symbol)}`),

  /** GET /api/AlphaVantage/overview/{symbol} — fundamentals (168hr backend cache). */
  getOverview: (symbol: string) =>
    apiClient.get<CompanyFundamentalsDto>(`${BASE}/overview/${encodeURIComponent(symbol)}`),
}
