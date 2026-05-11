import { PersonOverlay } from '@/features/person-overlay/PersonOverlay'
import { elonMuskFallback } from '@/features/person-overlay/personFallbackData'
import type { EntityRef } from '@/domain/types'

const MUSK_REF: EntityRef = {
  id:     elonMuskFallback.id,
  nodeId: elonMuskFallback.nodeId,
  type:   'PERSON',
  slug:   'elon-musk',
  name:   elonMuskFallback.fullName ?? 'Elon Musk',
}

export function PersonViewPanel() {
  return <PersonOverlay entity={MUSK_REF} />
}
