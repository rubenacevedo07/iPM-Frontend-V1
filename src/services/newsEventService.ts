import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'
import type { NewsEventDto } from '@/types/news'

const BASE = `${API_GRAPH}/NewsEvents`

export const newsEventService = {
  getByEntity: (entityNodeId: string, limit = 20) =>
    apiClient.get<NewsEventDto[]>(`${BASE}?entityNodeId=${encodeURIComponent(entityNodeId)}&limit=${limit}`),
  getLatest: (limit = 20) =>
    apiClient.get<NewsEventDto[]>(`${BASE}?limit=${limit}`),
}
