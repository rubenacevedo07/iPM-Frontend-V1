import { useState, useEffect } from 'react'
import { personService } from '@/services/personService'
import type { PersonSummary } from '@/types/person'

export function usePersons() {
  const [persons, setPersons] = useState<PersonSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    personService.getFull(1000)
      .then(setPersons)
      .catch(e => { console.error('[usePersons] failed:', e); setPersons([]) })
      .finally(() => setLoading(false))
  }, [])

  return { persons, loading }
}
