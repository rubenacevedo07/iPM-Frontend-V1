import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'
import type { CompositeIndexSnapshot } from '@/types/compositeRiskIndex'

const BASE = `${API_GRAPH}/risk-index`

export const compositeRiskIndexService = {
  getLatest: () => apiClient.get<CompositeIndexSnapshot[]>(`${BASE}/latest`),
  getDsi: () => apiClient.get<CompositeIndexSnapshot>(`${BASE}/dsi`),
  getGcri: () => apiClient.get<CompositeIndexSnapshot>(`${BASE}/gcri`),
  getHistory: (code: string) => apiClient.get<CompositeIndexSnapshot[]>(`${BASE}/${code}/history`),
}
