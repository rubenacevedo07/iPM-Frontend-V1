import { useState, useEffect } from 'react'
import { countryDependencyService } from '@/services/countryDependencyService'
import type { CountryDependencyProfile, CountryDependencyGlobalReport } from '@/types/countryDependency'

export function useCountryDependencies() {
  const [profiles, setProfiles] = useState<CountryDependencyProfile[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    countryDependencyService
      .getAll()
      .then(setProfiles)
      .catch((err: Error) => {
        console.warn('useCountryDependencies:', err)
        setError(err.message ?? 'Failed to load country dependency profiles')
        setProfiles([])
      })
      .finally(() => setLoading(false))
  }, [])

  return { profiles, loading, error }
}

export function useCountryDependency(countryId: number | null = null) {
  const [profile, setProfile] = useState<CountryDependencyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!countryId) { setProfile(null); return }
    setLoading(true)
    setError(null)
    countryDependencyService
      .getById(countryId)
      .then(setProfile)
      .catch((err: Error) => {
        console.warn('useCountryDependency:', err)
        setError(err.message ?? 'Failed to load country dependency profile')
        setProfile(null)
      })
      .finally(() => setLoading(false))
  }, [countryId])

  return { profile, loading, error }
}

export function useCountryDependencyGlobalReport() {
  const [report,  setReport]  = useState<CountryDependencyGlobalReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    countryDependencyService
      .getGlobalReport()
      .then(setReport)
      .catch((err: Error) => {
        console.warn('useCountryDependencyGlobalReport:', err)
        setError(err.message ?? 'Failed to load country dependency global report')
        setReport(null)
      })
      .finally(() => setLoading(false))
  }, [])

  return { report, loading, error }
}
