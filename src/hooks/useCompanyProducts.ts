import { useState, useEffect } from 'react'
import { companyProductService } from '@/services/companyProductService'
import type { CompanyProduct } from '@/types/companyProduct'

export function useCompanyProducts(companyId: number | null) {
  const [products, setProducts] = useState<CompanyProduct[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (companyId === null) { setProducts([]); setLoading(false); setError(null); return }
    const doFetch = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await companyProductService.getByCompanyId(companyId)
        setProducts(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading products')
      } finally {
        setLoading(false)
      }
    }
    doFetch()
  }, [companyId])

  return { products, loading, error }
}
