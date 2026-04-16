import { useState, useEffect } from 'react'
import { personIntelligenceService } from '@/services/personIntelligenceService'
import type { PersonPowerIndex } from '@/types/person'

interface Result {
  data: PersonPowerIndex | null
  isLoading: boolean
  error: Error | null
}

export function usePersonPowerIndex(personId: number | null): Result {
  const [data, setData]         = useState<PersonPowerIndex | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState<Error | null>(null)

  useEffect(() => {
    if (!personId) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setData(null)
    setError(null)
    personIntelligenceService.getPersonPowerIndex(personId)
      .then(d  => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [personId])

  return { data, isLoading, error }
}
