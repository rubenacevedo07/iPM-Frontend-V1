import { useSearch } from '@tanstack/react-router'
import { AppActor } from '@/app/AppProviders'
import { StudioRelationView } from '@/features/person-overlay/StudioRelationView'
import { usePersonsMap } from '@/hooks/usePersonsMap'
import type { EntityRef } from '@/domain/types'

export function RelationViewPanel() {
  const appRef  = AppActor.useActorRef()
  const search  = useSearch({ from: '/workstation' })
  const { persons, loading } = usePersonsMap()

  if (loading) return null

  const resolve = (nodeId: string) => persons.find(p => p.nodeId === nodeId) ?? null

  const seedA = resolve(search.relationA ?? 'person:7')   ?? resolve('person:7')
  const seedB = resolve(search.relationB ?? 'person:173') ?? resolve('person:173')

  if (!seedA || !seedB) return null

  const toRef = (seed: typeof seedA): EntityRef => ({
    id:     seed!.id,
    nodeId: seed!.nodeId,
    type:   'PERSON',
    slug:   seed!.slug,
    name:   seed!.fullName,
  })

  return (
    <StudioRelationView
      entityA={toRef(seedA)}
      entityB={toRef(seedB)}
      seedA={seedA}
      seedB={seedB}
      onClose={() => appRef.send({ type: 'ATLAS_VIEW.SET', view: 'globe' })}
    />
  )
}
