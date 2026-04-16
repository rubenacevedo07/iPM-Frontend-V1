import { useState, useEffect } from 'react'
import { countryService } from '@/services/countryService'
import type { Country } from '@/types/country'

export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    countryService
      .getAll()
      .then(setCountries)
      .catch((err: Error) => {
        console.error('useCountries:', err)
        setError(err.message ?? 'Failed to load countries')
      })
      .finally(() => setLoading(false))
  }, [])

  return { countries, loading, error }
}
