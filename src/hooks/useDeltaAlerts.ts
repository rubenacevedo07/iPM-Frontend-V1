import { useState, useEffect } from 'react'
import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'

export interface DeltaAlert {
  id: number
  entityNodeId: string
  entityName?: string
  code: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  delta: number
  description?: string
  createdAt: string
}

export function useDeltaAlerts() {
  const [data, setData] = useState<DeltaAlert[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient
      .get<DeltaAlert[]>(`${API_GRAPH}/delta-alerts`)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}
