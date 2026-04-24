/**
 * sceneMap shim — two canonical bugs absorbed here (Rule 6-safe).
 *
 * Bug 1: entity-inspector.machine imports from '@/components/overlays/sceneMap'
 * but canonical sceneMap lives at '@/features/person-overlay/sceneMap'.
 * (find "IPM_Frontend/src" -name "sceneMap*" returns only the person-overlay file.)
 *
 * Bug 2: entity-inspector.machine.ts:53 calls `getScene(e.nodeId, e.name)` (2 args)
 * but canonical getScene signature is `(id: number, type: EntityType, name: string)` (3 args).
 * At runtime the 2-arg call passes nodeId-string as `id` and name as `type`, leaving
 * the real `name` arg `undefined` → crash on `name.toUpperCase()` in FALLBACK branch.
 *
 * This shim exports a widened `getScene` that accepts both signatures:
 *   - canonical 3-arg: (id: number, type: EntityType, name: string)
 *   - entity-inspector 2-arg bug: (nodeId: string, name: string)
 *
 * Logged as debt entry (e) in docs/PHASE_6_DEBT.md — upstream v3 bugs to fix separately.
 */
import { getScene as canonicalGetScene } from '@/features/person-overlay/sceneMap'
import type { TransitionScene } from '@/domain/types'

type EntityTypeLike = 'PERSON' | 'COMPANY' | 'COUNTRY' | 'COMMODITY'

export function getScene(
  idOrNodeId: number | string,
  typeOrName: string,
  name?: string,
): TransitionScene {
  // Detect v3 entity-inspector 2-arg bug: first arg looks like a nodeId ("person:7")
  // AND third arg is undefined.
  const isTwoArgBug =
    typeof idOrNodeId === 'string' &&
    idOrNodeId.includes(':') &&
    name === undefined

  if (isTwoArgBug) {
    const [rawType, rawId] = idOrNodeId.split(':')
    const parsedId = parseInt(rawId ?? '0', 10)
    const type = (rawType?.toUpperCase() ?? 'PERSON') as EntityTypeLike
    const safeName = typeOrName && typeOrName.trim() !== '' ? typeOrName : `${type} #${parsedId}`
    return canonicalGetScene(isNaN(parsedId) ? 0 : parsedId, type, safeName)
  }

  // Canonical 3-arg form
  const safeName = name && name.trim() !== ''
    ? name
    : `${typeOrName ?? 'ENTITY'} #${idOrNodeId}`
  return canonicalGetScene(
    idOrNodeId as number,
    typeOrName as EntityTypeLike,
    safeName,
  )
}
