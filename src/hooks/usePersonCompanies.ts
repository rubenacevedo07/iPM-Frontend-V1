import { useState, useEffect } from 'react'
import { personIntelligenceService } from '@/services/personIntelligenceService'
import type { PersonCompany } from '@/types/person'

export function usePersonCompanies(personId: number | null): {
  data: PersonCompany[] | null
  loading: boolean
  error: string | null
} {
  const [data, setData]       = useState<PersonCompany[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!personId) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setData(null)
    setError(null)
    personIntelligenceService.getCompanies(personId)
      .then(d  => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [personId])

  return { data, loading, error }
}
