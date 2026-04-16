import { useState, useEffect } from 'react'
import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'

export interface KeyDriver {
  term: string
  score: number
  category?: string
}

export function useKeyDrivers(nodeId: string | null) {
  const [data, setData] = useState<KeyDriver[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!nodeId) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient
      .get<KeyDriver[]>(`${API_GRAPH}/Entities/${encodeURIComponent(nodeId)}/key-drivers`)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [nodeId])

  return { data, loading, error }
}
