import { useState, useEffect } from 'react'
import { countryRelationService } from '@/services/countryRelationService'
import type { CountryRelation } from '@/types/countryRelation'

export function useCountryRelations(countryId: number | null = null) {
  const [relations, setRelations] = useState<CountryRelation[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const request = countryId
      ? countryRelationService.getByCountryId(countryId)
      : countryRelationService.getAll()
    request
      .then(setRelations)
      .catch((err: Error) => {
        console.error('useCountryRelations:', err)
        setError(err.message ?? 'Failed to load country relations')
        setRelations([])
      })
      .finally(() => setLoading(false))
  }, [countryId])

  return { relations, loading, error }
}
