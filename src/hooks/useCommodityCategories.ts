import { useState, useEffect } from 'react'
import { commodityService } from '@/services/commodityService'
import type { CommodityCategory } from '@/types/commodity'

export function useCommodityCategories() {
  const [categories, setCategories] = useState<CommodityCategory[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    commodityService
      .getAllCategories()
      .then(setCategories)
      .catch((err: Error) => {
        console.error('useCommodityCategories:', err)
        setError(err.message ?? 'Failed to load categories')
      })
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading, error }
}
