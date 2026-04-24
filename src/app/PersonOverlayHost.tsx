import { useSearch } from '@tanstack/react-router'
import { PersonOverlay } from '@/features/person-overlay/PersonOverlay'
import type { EntityRef } from '@/domain/types'

export function PersonOverlayHost() {
  const search = useSearch({ from: '/workstation' })

  const isPerson = search.overlay === 'person'
  const id = typeof search.id === 'number' ? search.id : null

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

  // Close is dispatched internally by PersonOverlay via appRef.send({ type: 'ENTITY.CLOSE' }).
  // V1 app.machine handles ENTITY.CLOSE as alias for CLOSE_OVERLAY (Phase 6 Stage 1).
  // Rule 3: no router.navigate from here — URL mutation routes through the actor.
  return <PersonOverlay entity={entity} />
}
