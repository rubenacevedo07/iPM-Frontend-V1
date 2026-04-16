import { API_COUNTRIES } from '@/config/apiConfig'
import type { CountryRelation } from '@/types/countryRelation'

export const countryRelationService = {
  getAll: async (): Promise<CountryRelation[]> => {
    const response = await fetch(`${API_COUNTRIES}/CountryRelations`)
    if (!response.ok) throw new Error(`Error fetching country relations: ${response.status} ${response.statusText}`)
    return response.json()
  },
  getByCountryId: async (countryId: number): Promise<CountryRelation[]> => {
    const response = await fetch(`${API_COUNTRIES}/CountryRelations/country/${countryId}`)
    if (!response.ok) throw new Error(`Error fetching relations for country ${countryId}: ${response.status} ${response.statusText}`)
    return response.json()
  },
}
