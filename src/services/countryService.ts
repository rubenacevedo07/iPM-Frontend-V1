import { API_COUNTRIES } from '@/config/apiConfig'
import type { Country } from '@/types/country'

export const countryService = {
  getAll: async (): Promise<Country[]> => {
    const response = await fetch(`${API_COUNTRIES}/Countries`)
    if (!response.ok) throw new Error(`Error fetching countries: ${response.status} ${response.statusText}`)
    return response.json()
  },
  getById: async (id: number): Promise<Country> => {
    const response = await fetch(`${API_COUNTRIES}/Countries/${id}`)
    if (!response.ok) throw new Error(`Error fetching country ${id}: ${response.status} ${response.statusText}`)
    return response.json()
  },
}
