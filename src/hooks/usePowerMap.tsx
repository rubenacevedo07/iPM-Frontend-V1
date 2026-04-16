import { useState, useEffect, useCallback } from 'react'
import { powerMapService } from '@/services/powerMapService'
import type { PowerMap, PowerMapLayer, PowerMapElement } from '@/types/powerMap'

export interface PowerMapState {
  powerMap:  PowerMap | null
  loading:   boolean
  error:     string | null
  refetch:   () => void
}

export function usePowerMap(id: number): PowerMapState {
  const [powerMap, setPowerMap] = useState<PowerMap | null>(null)
  const [loading,  setLoading]  = useState<boolean>(true)
  const [error,    setError]    = useState<string | null>(null)

  const doFetch = useCallback(async () => {
    if (!id || id <= 0) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const data = await powerMapService.getPowerMapById(id)
      setPowerMap(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load power map')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { doFetch() }, [doFetch])

  return { powerMap, loading, error, refetch: doFetch }
}

export function getElementsByLayer(elements: PowerMapElement[], layerId: number): PowerMapElement[] {
  return elements.filter(e => e.layerId === layerId).sort((a, b) => a.tier - b.tier)
}

export function sortedLayers(layers: PowerMapLayer[]): PowerMapLayer[] {
  return [...layers].sort((a, b) => a.level - b.level)
}
