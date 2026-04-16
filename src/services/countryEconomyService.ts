import { API_COUNTRIES } from '@/config/apiConfig'
import type { CountryEconomy } from '@/types/countryEconomy'

export const countryEconomyService = {
  getAll: async (): Promise<CountryEconomy[]> => {
    const response = await fetch(`${API_COUNTRIES}/CountryEconomies`)
    if (!response.ok) throw new Error(`Error fetching country economies: ${response.status} ${response.statusText}`)
    return response.json()
  },
  getByCountryId: async (countryId: number): Promise<CountryEconomy[]> => {
    const response = await fetch(`${API_COUNTRIES}/CountryEconomies/country/${countryId}`)
    if (!response.ok) throw new Error(`Error fetching economy for country ${countryId}: ${response.status} ${response.statusText}`)
    return response.json()
  },
}
