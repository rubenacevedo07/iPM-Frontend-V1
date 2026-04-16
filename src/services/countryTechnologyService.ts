import { API_COUNTRIES } from '@/config/apiConfig'
import type { CountryTechnology } from '@/types/countryTechnology'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`CountryTechnology API error ${response.status}: ${response.statusText}`)
  return response.json() as Promise<T>
}

export const countryTechnologyService = {
  getAll(): Promise<CountryTechnology[]> {
    return fetchJson<CountryTechnology[]>(`${API_COUNTRIES}/CountryTechnologies`)
  },
  getByCountryId(countryId: number): Promise<CountryTechnology[]> {
    return fetchJson<CountryTechnology[]>(`${API_COUNTRIES}/CountryTechnologies/country/${countryId}`)
  },
}
