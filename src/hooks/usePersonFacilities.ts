import { useState, useEffect } from 'react'
import { personIntelligenceService } from '@/services/personIntelligenceService'
import type { PersonFacility } from '@/types/person'

export function usePersonFacilities(personId: number | null): {
  data: PersonFacility[] | null
  loading: boolean
  error: string | null
} {
  const [data, setData]       = useState<PersonFacility[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!personId) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setData(null)
    setError(null)
    personIntelligenceService.getFacilities(personId)
      .then(d  => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [personId])

  return { data, loading, error }
}
