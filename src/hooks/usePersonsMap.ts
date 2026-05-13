import { useState, useEffect } from 'react'
import { personMapService } from '@/services/personMapService'
import type { PersonMapDto } from '@/types/_ext/personMapDto'

export function usePersonsMap() {
  const [persons, setPersons] = useState<PersonMapDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    personMapService.getTop15()
      .then(setPersons)
      .catch(() => { /* API offline — globe renders without persons */ })
      .finally(() => setLoading(false))
  }, [])

  return { persons, loading }
}
