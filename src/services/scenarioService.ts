import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'
import type { ScenarioCascade } from '@/types/scenario'

const BASE = `${API_GRAPH}/scenarios`

export const scenarioService = {
  getAll: () => apiClient.get<ScenarioCascade[]>(BASE),
  getById: (id: number) => apiClient.get<ScenarioCascade>(`${BASE}/${id}`),
  run: (id: number) => apiClient.post<ScenarioCascade>(`${BASE}/${id}/run`),
}
