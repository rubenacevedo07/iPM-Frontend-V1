import { useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { AppActor } from './app.machine'
import { GoldOverlay } from '@/features/gold-overlay/GoldOverlay'
import {
  elonMuskConnections,
  elonMuskClients,
  elonMuskFocalCoords,
} from '@/features/person-overlay/personFallbackData'
import { mapPersonConnectionsToArcs } from '@/services/personNetworkMapper'

export function GoldOverlayHost() {
  const search = useSearch({ from: '/workstation' })
  const actor  = AppActor.useActorRef()

  const isGold = search.overlay === 'gold'
  const id = typeof search.id === 'number' ? search.id : null

  useEffect(() => {
    if (!isGold || id == null) return
    const arcs = mapPersonConnectionsToArcs(
      elonMuskConnections, elonMuskClients, elonMuskFocalCoords, 'person:7',
    )
    actor.send({ type: 'PERSON_NETWORK_RESOLVED', personId: id, arcs })
  }, [isGold, id, actor])

  return (
    <AnimatePresence>
      {isGold && id != null && (
        <GoldOverlay key={`gold-${id}`} entityName={`Company #${id}`} />
      )}
    </AnimatePresence>
  )
}
