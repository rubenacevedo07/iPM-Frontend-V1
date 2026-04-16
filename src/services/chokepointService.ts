import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'
import type { CommodityChokepoint, ChokepointRiskSummary } from '@/types/chokepoint'

const BASE = `${API_GRAPH}/chokepoints`

export const chokepointService = {
  getAll: () => apiClient.get<CommodityChokepoint[]>(BASE),
  getById: (id: number) => apiClient.get<CommodityChokepoint>(`${BASE}/${id}`),
  getRiskSummary: () => apiClient.get<ChokepointRiskSummary[]>(`${BASE}/risk-summary`),
}
