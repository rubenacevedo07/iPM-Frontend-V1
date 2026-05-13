import { GoldOverlay } from '@/features/gold-overlay/GoldOverlay'
import { usePersonsMap } from '@/hooks/usePersonsMap'
import { useUIState } from './useUIState'
import { getOverlay } from './selectUIState'

/**
 * URL → GoldOverlay dispatcher. Active when the discriminated UIState
 * resolves to an overlay of kind 'gold' on either globe or network.
 * Day 3: read overlay payload from `useUIState()` instead of `useSearch`.
 * `selectUIState` already validates `id` is a number; no defensive guard
 * needed at this site.
 */
export function GoldOverlayHost() {
  const ui = useUIState()
  const { persons, loading: personsLoading } = usePersonsMap()

  const overlay = getOverlay(ui)
  if (overlay?.kind !== 'gold') return null
  // Wait for the persons batch before mounting so seed is always available.
  // Prevents the cold-load race where seed=null causes photo/name to flash in
  // empty then update 100-300ms later once usePersonIntelligence resolves.
  if (personsLoading) return null

  const { id } = overlay
  const nodeId = `person:${id}`
  const seed = persons.find(p => p.id === id) ?? null
  return <GoldOverlay key={id} id={id} nodeId={nodeId} seed={seed} />
}
