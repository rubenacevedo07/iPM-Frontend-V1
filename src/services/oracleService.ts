import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'
import type { AnalystPrediction, OracleStats, OracleLeaderboardEntry } from '@/types/oracle'

const BASE = `${API_GRAPH}/oracle`

export const oracleService = {
  getPredictions: (status?: string, machineName?: string) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (machineName) params.set('machineName', machineName)
    const qs = params.toString()
    return apiClient.get<AnalystPrediction[]>(`${BASE}/predictions${qs ? `?${qs}` : ''}`)
  },
  getStats: () => apiClient.get<OracleStats>(`${BASE}/predictions/stats`),
  getLeaderboard: () => apiClient.get<OracleLeaderboardEntry[]>(`${BASE}/predictions/leaderboard`),
}
