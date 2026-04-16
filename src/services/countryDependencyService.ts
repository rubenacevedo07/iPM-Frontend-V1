import { API_COUNTRIES } from '@/config/apiConfig'
import type { CountryDependencyProfile, CountryDependencyGlobalReport } from '@/types/countryDependency'

const BASE = `${API_COUNTRIES}/CountryDependency`

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CountryDependency: ${res.status} ${res.statusText} — ${url}`)
  return res.json()
}

export const countryDependencyService = {
  getAll: (): Promise<CountryDependencyProfile[]> => get<CountryDependencyProfile[]>(BASE),
  getById: (countryId: number): Promise<CountryDependencyProfile> => get<CountryDependencyProfile>(`${BASE}/${countryId}`),
  getGlobalReport: (): Promise<CountryDependencyGlobalReport> => get<CountryDependencyGlobalReport>(`${BASE}/global-report`),
}
