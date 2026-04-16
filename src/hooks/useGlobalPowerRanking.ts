import { useState, useEffect } from 'react'
import { API_GRAPH } from '@/config/apiConfig'
import { apiClient } from '@/services/api/apiClient'
import type { GlobalPowerRankingCardDto } from '@/types/GlobalPowerRankingCardDto'

let _cache: GlobalPowerRankingCardDto[] | null = null
let _inflight: Promise<GlobalPowerRankingCardDto[]> | null = null

function fetchRanking(): Promise<GlobalPowerRankingCardDto[]> {
  if (_cache !== null) return Promise.resolve(_cache)
  if (_inflight !== null) return _inflight

  _inflight = apiClient
    .get<Array<Record<string, unknown>>>(`${API_GRAPH}/power/global-ranking?limit=50`)
    .then((raw) => {
      if (!Array.isArray(raw)) return []
      const mapped: GlobalPowerRankingCardDto[] = raw.map((r) => ({
        ...r,
        rank:              r.globalRank,
        name:              (r.person as Record<string, unknown>)?.fullName ?? r.fullName ?? '',
        entityType:        'PERSON' as const,
        scoreDelta:        null,
        fpi:               (r.fpi  as number) ?? 0,
        mpi:               (r.mpi  as number) ?? 0,
        spi:               (r.spi  as number) ?? 0,
        cpi:               (r.cpi  as number) ?? 0,
        ppi:               (r.ppi  as number) ?? 0,
        ipi:               (r.ipi  as number) ?? 0,
        ideologyLabel:     '',
        ideologyIntensity: 0,
        metricA:           r.reachMetricA,
        metricB:           r.reachMetricB,
        metricC:           r.reachMetricC,
        updatedAt:         r.computedAt,
      })) as GlobalPowerRankingCardDto[]
      _cache    = mapped
      _inflight = null
      return mapped
    })
    .catch(err => { _inflight = null; throw err })

  return _inflight
}

export function useGlobalPowerRanking() {
  const [cards, setCards]     = useState<GlobalPowerRankingCardDto[]>(_cache ?? [])
  const [loading, setLoading] = useState(_cache === null)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (_cache !== null) { setCards(_cache); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchRanking()
      .then(data => { if (!cancelled) { setCards(data); setLoading(false) } })
      .catch(e   => { if (!cancelled) { setError(e instanceof Error ? e.message : String(e)); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  return { cards, loading, error }
}
