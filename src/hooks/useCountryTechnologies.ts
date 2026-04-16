import { useState, useEffect } from 'react'
import { countryTechnologyService } from '@/services/countryTechnologyService'
import type { CountryTechnology } from '@/types/countryTechnology'

export function useCountryTechnologies(countryId: number | null = null) {
  const [technologies, setTechnologies] = useState<CountryTechnology[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const request = countryId
      ? countryTechnologyService.getByCountryId(countryId)
      : countryTechnologyService.getAll()
    request
      .then(setTechnologies)
      .catch((err: Error) => {
        console.error('useCountryTechnologies:', err)
        setError(err.message ?? 'Failed to load country technologies')
        setTechnologies([])
      })
      .finally(() => setLoading(false))
  }, [countryId])

  return { technologies, loading, error }
}
