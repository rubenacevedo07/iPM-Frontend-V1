import { API_COMPANIES as API_BASE } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'
import type {
  PersonIntelligence,
  IdeologyProfile,
  PersonWealth,
  PersonRiskProfile,
  SupplyChainLink,
  PersonSector,
  PersonPowerIndex,
  PersonVision,
  PersonCompany,
  PersonFacility,
} from '@/types/person'

const BASE       = `${API_BASE}/persons`
const POWER_BASE = `${API_BASE}/power-index`

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`PersonIntelligence ${res.status}: ${res.statusText}`)
  return res.json()
}

async function fetchJsonOrNull<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`PersonIntelligence ${res.status}: ${res.statusText}`)
  return res.json()
}

export const personIntelligenceService = {
  getIntelligence: (personId: number) =>
    fetchJson<PersonIntelligence>(`${BASE}/${personId}/intelligence`),
  getIdeology: (personId: number) =>
    fetchJson<IdeologyProfile>(`${BASE}/${personId}/ideology`),
  getWealth: (personId: number) =>
    fetchJson<PersonWealth>(`${BASE}/${personId}/wealth`),
  getRisk: (personId: number, category?: 'POWER' | 'VULNERABILITY') => {
    const qs = category ? `?category=${category}` : ''
    return fetchJson<PersonRiskProfile[]>(`${BASE}/${personId}/risk${qs}`)
  },
  getSupplyChain: (personId: number) =>
    fetchJson<SupplyChainLink[]>(`${BASE}/${personId}/supply-chain`),
  getSectors: (personId: number) =>
    fetchJson<PersonSector[]>(`${BASE}/${personId}/sectors`),
  getPersonPowerIndex: (personId: number) =>
    apiClient.get<PersonPowerIndex>(`${POWER_BASE}/persons/${personId}`),
  getPersonPowerIndexHistory: (personId: number) =>
    apiClient.get<PersonPowerIndex[]>(`${POWER_BASE}/history/${personId}`),
  getVision: (personId: number) =>
    fetchJsonOrNull<PersonVision>(`${BASE}/${personId}/vision`),
  getCompanies: (personId: number) =>
    fetchJson<PersonCompany[]>(`${BASE}/${personId}/companies`),
  getFacilities: (personId: number) =>
    fetchJson<PersonFacility[]>(`${BASE}/${personId}/facilities`),
}
