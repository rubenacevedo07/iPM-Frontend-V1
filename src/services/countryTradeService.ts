import { API_TRADES } from '@/config/apiConfig'
import type { CountryTrade } from '@/types/countryTrade'

export const countryTradeService = {
  getAll: async (): Promise<CountryTrade[]> => {
    const response = await fetch(`${API_TRADES}/CountryTrades`)
    if (!response.ok) throw new Error(`Error fetching country trades: ${response.status} ${response.statusText}`)
    return response.json()
  },
  getByCountryId: async (countryId: number): Promise<CountryTrade[]> => {
    const response = await fetch(`${API_TRADES}/CountryTrades/country/${countryId}`)
    if (!response.ok) throw new Error(`Error fetching trades for country ${countryId}: ${response.status} ${response.statusText}`)
    return response.json()
  },
  getByPartnerId: async (partnerId: number): Promise<CountryTrade[]> => {
    const response = await fetch(`${API_TRADES}/CountryTrades/partner/${partnerId}`)
    if (!response.ok) throw new Error(`Error fetching trades for partner ${partnerId}: ${response.status} ${response.statusText}`)
    return response.json()
  },
}
