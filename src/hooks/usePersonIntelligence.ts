import { useState, useEffect } from 'react'
import { personIntelligenceService } from '@/services/personIntelligenceService'
import type {
  PersonIntelligence,
  IdeologyProfile,
  PersonWealth,
  PersonRiskProfile,
  SupplyChainLink,
  PersonSector,
} from '@/types/person'

interface Result<T> {
  data: T | null
  loading: boolean
  error: string | null
}

function useService<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  enabled: boolean,
): Result<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcher()
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}

export function usePersonIntelligence(personId: number | null) {
  return useService<PersonIntelligence>(
    () => personIntelligenceService.getIntelligence(personId!),
    [personId], !!personId,
  )
}

export function usePersonIdeology(personId: number | null) {
  return useService<IdeologyProfile>(
    () => personIntelligenceService.getIdeology(personId!),
    [personId], !!personId,
  )
}

export function usePersonWealth(personId: number | null) {
  return useService<PersonWealth>(
    () => personIntelligenceService.getWealth(personId!),
    [personId], !!personId,
  )
}

export function usePersonRisk(personId: number | null, category?: 'POWER' | 'VULNERABILITY') {
  return useService<PersonRiskProfile[]>(
    () => personIntelligenceService.getRisk(personId!, category),
    [personId, category], !!personId,
  )
}

export function usePersonSupplyChain(personId: number | null) {
  return useService<SupplyChainLink[]>(
    () => personIntelligenceService.getSupplyChain(personId!),
    [personId], !!personId,
  )
}

export function usePersonSectors(personId: number | null) {
  return useService<PersonSector[]>(
    () => personIntelligenceService.getSectors(personId!),
    [personId], !!personId,
  )
}
