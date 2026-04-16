import { useState, useEffect } from 'react'
import { newsEventService } from '@/services/newsEventService'
import type { NewsEventDto } from '@/types/news'

export function useEntityNews(nodeId: string | null, limit = 20) {
  const [data, setData] = useState<NewsEventDto[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!nodeId) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    newsEventService
      .getByEntity(nodeId, limit)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [nodeId, limit])

  return { data, loading, error }
}
