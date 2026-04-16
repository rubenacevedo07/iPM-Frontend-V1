import { useState, useEffect } from 'react'
import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'

export interface CompositeIndexSnapshot {
  code: string
  label: string
  value: number
  delta?: number
  trend?: 'up' | 'down' | 'flat'
  asOf?: string
}

let _cache: CompositeIndexSnapshot[] | null = null
let _inflight: Promise<CompositeIndexSnapshot[]> | null = null

function fetchIndices(): Promise<CompositeIndexSnapshot[]> {
  if (_cache !== null) return Promise.resolve(_cache)
  if (_inflight !== null) return _inflight

  _inflight = apiClient
    .get<CompositeIndexSnapshot[]>(`${API_GRAPH}/risk-index/latest`)
    .then(data => { _cache = data; _inflight = null; return data })
    .catch(err => { _inflight = null; throw err })

  return _inflight
}

export function useCompositeIndices() {
  const [data, setData]       = useState<CompositeIndexSnapshot[] | null>(_cache)
  const [loading, setLoading] = useState(_cache === null)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (_cache !== null) { setData(_cache); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchIndices()
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}
