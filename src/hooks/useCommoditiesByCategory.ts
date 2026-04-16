import { useState, useEffect } from 'react'
import { commodityService } from '@/services/commodityService'
import type { Commodity } from '@/types/commodity'

export function useCommoditiesByCategory(categoryId: number | null) {
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (categoryId == null) { setCommodities([]); return }
    setLoading(true)
    setError(null)
    commodityService
      .getByCategoryId(categoryId)
      .then(setCommodities)
      .catch((err: Error) => {
        console.error('useCommoditiesByCategory:', err)
        setError(err.message ?? 'Failed to load commodities')
        setCommodities([])
      })
      .finally(() => setLoading(false))
  }, [categoryId])

  return { commodities, loading, error }
}
