import { useState, useEffect } from 'react'
import { companyService } from '@/services/companyService'
import type { Company } from '@/types/company'

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        const data = await companyService.getAll()
        setCompanies(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al cargar empresas')
      } finally {
        setLoading(false)
      }
    }
    fetchCompanies()
  }, [])

  return { companies, loading, error }
}
