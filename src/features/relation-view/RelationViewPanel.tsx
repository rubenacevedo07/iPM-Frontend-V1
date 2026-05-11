import { AppActor } from '@/app/AppProviders'
import { StudioRelationView } from '@/features/person-overlay/StudioRelationView'
import { elonMuskFallback, donaldTrumpFallback } from '@/features/person-overlay/personFallbackData'
import type { EntityRef } from '@/domain/types'

const MUSK_REF: EntityRef = {
  id:     elonMuskFallback.id,
  nodeId: elonMuskFallback.nodeId,
  type:   'PERSON',
  slug:   'elon-musk',
  name:   elonMuskFallback.fullName ?? 'Elon Musk',
}

const TRUMP_REF: EntityRef = {
  id:     donaldTrumpFallback.id,
  nodeId: donaldTrumpFallback.nodeId,
  type:   'PERSON',
  slug:   'donald-trump',
  name:   donaldTrumpFallback.fullName ?? 'Donald Trump',
}

export function RelationViewPanel() {
  const appRef = AppActor.useActorRef()
  return (
    <StudioRelationView
      entityA={MUSK_REF}
      entityB={TRUMP_REF}
      onClose={() => appRef.send({ type: 'ATLAS_VIEW.SET', view: 'globe' })}
    />
  )
}
