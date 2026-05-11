import { useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { PersonOverlay } from '@/features/person-overlay/PersonOverlay'
import { AppActor } from './app.machine'
import type { EntityRef } from '@/domain/types'
import {
  elonMuskConnections,
  elonMuskClients,
  elonMuskFocalCoords,
} from '@/features/person-overlay/personFallbackData'
import { mapPersonConnectionsToArcs } from '@/services/personNetworkMapper'

export function PersonOverlayHost() {
  const search = useSearch({ from: '/workstation' })
  const actor  = AppActor.useActorRef()

  const isPerson = search.overlay === 'person'
  const id = typeof search.id === 'number' ? search.id : null

  useEffect(() => {
    if (!isPerson || id == null) return
    const arcs = mapPersonConnectionsToArcs(
      elonMuskConnections, elonMuskClients, elonMuskFocalCoords, 'person:7',
    )
    actor.send({ type: 'PERSON_NETWORK_RESOLVED', personId: id, arcs })
  }, [isPerson, id, actor])

  if (!isPerson || id == null) return null

  // v3 PersonOverlay expects EntityRef. It fetches person data internally via
  // useQuery(qk.person(entity.id)) and neighbors via qk.personNeighbors(entity.nodeId).
  // Host provides only the minimum shape required by that fetch contract.
  const entity: EntityRef = {
    id,
    nodeId: `person:${id}`,
    type:   'PERSON',
    slug:   '',
    name:   '',
  }

  return <PersonOverlay entity={entity} />
}
