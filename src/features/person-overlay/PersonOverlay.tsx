import { useMachine, useSelector } from '@xstate/react'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { personOverlayMachine } from './person-overlay.machine'
import { AppActor } from '@/app/AppProviders'
import { qk, fetchers } from '@/domain/queries'
import { CinematicTransition } from './CinematicTransition'
import { PersonSoloView } from './PersonSoloView'
import { StudioRelationView } from './StudioRelationView'
import { getScene } from './sceneMap'
import { elonMuskFallback, fallbackNeighbors } from './personFallbackData'
import { usePersonsMap } from '@/hooks/usePersonsMap'
import type { EntityRef, EntityType } from '@/domain/types'

interface PersonOverlayProps {
  entity: EntityRef
}

// Convert a NeighborNode's nodeId ("person:7") into an EntityRef
function nodeIdToEntityRef(nodeId: string, name: string): EntityRef {
  const [rawType, rawId] = nodeId.split(':')
  const id = parseInt(rawId ?? '0', 10)

  const typeMap: Record<string, EntityType> = {
    person:  'PERSON',
    company: 'COMPANY',
    country: 'COUNTRY',
  }
  const type: EntityType = typeMap[rawType ?? ''] ?? 'PERSON'

  return {
    id: isNaN(id) ? 0 : id,
    nodeId,
    type,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    name,
  }
}

export function PersonOverlay({ entity }: PersonOverlayProps) {
  const appRef = AppActor.useActorRef()
  const [state, send] = useMachine(personOverlayMachine, {
    input: { entity },
  })
  const { persons } = usePersonsMap()

  const inspectorRef = state.context.inspectorRef
  const tabsRef      = state.context.tabsRef

  // Inspector state value — may be a nested object in parallel machines
  const inspectorState = useSelector(inspectorRef!, s => s?.value ?? 'closed')

  // Inspector context for relation target
  const relationTarget = useSelector(inspectorRef!, s => s?.context.relationTarget ?? null)
  const inspCtx          = useSelector(inspectorRef!, s => s?.context)

  // ── Data: primary entity ──────────────────────────
  const { data: person, isLoading: personLoading } = useQuery({
    queryKey: qk.person(entity.id),
    queryFn: () => fetchers.person(entity.id),
    enabled: !!entity.id,
    retry: false,
  })

  const { data: neighbors, isError: neighborsError } = useQuery({
    queryKey: qk.personNeighbors(entity.nodeId),
    queryFn: () => fetchers.personNeighbors(entity.nodeId),
    enabled: !!entity.nodeId,
    retry: false,
  })

  // ── Handlers ──────────────────────────────────────
  const handleClose = () => {
    send({ type: 'CLOSE' })
    appRef.send({ type: 'ENTITY.CLOSE' })
  }

  // Called from PersonSoloView when user clicks "Open Studio Relation" on a node
  const handleOpenRelation = (targetNodeId: string, targetName: string) => {
    send({ type: 'RELATION.OPEN', target: nodeIdToEntityRef(targetNodeId, targetName) })
  }

  // Use fallback data for known demo entities
  const personData = person ?? (entity.id === 5 || entity.id === 7 ? elonMuskFallback : undefined)

  // Use fallback neighbors whenever API errors or returns empty — regardless of entity id
  const safeNeighbors = (!neighborsError && neighbors?.nodes?.length)
    ? neighbors
    : fallbackNeighbors

  const scene = getScene(entity.id, entity.type, entity.name)

  // Skip cinematic so globe stays visible (same mechanic as company overlay).
  // Effect fires after mount; machine advances to 'solo' before the user sees the transition.
  useEffect(() => {
    if (inspectorState === 'cinematic') {
      inspectorRef?.send({ type: 'CINEMATIC.COMPLETE' })
    }
  }, [inspectorState, inspectorRef])

  // ── Cinematic (initial open or relation handoff — both use entity-inspector `cinematic` state) ──
  if (inspectorState === 'cinematic') {
    const rel = inspCtx?.transitionTarget === 'relation' ? inspCtx.relationTarget : null
    const cineScene = rel
      ? getScene(rel.id, rel.type, rel.name)
      : scene
    const label = rel?.name ?? entity.name
    return (
      <CinematicTransition
        scene={cineScene}
        label={label}
        onComplete={() => inspectorRef?.send({ type: 'CINEMATIC.COMPLETE' })}
      />
    )
  }

  // ── Relation view ──────────────────────────────────
  if (inspectorState === 'relation') {
    const entityB = relationTarget

    if (entityB && inspectorRef) {
      const seedA = persons.find(p => p.nodeId === entity.nodeId) ?? null
      const seedB = persons.find(p => p.nodeId === entityB.nodeId) ?? null
      return (
        <StudioRelationView
          entityA={entity}
          entityB={entityB}
          seedA={seedA}
          seedB={seedB}
          inspectorRef={inspectorRef}
          onClose={handleClose}
        />
      )
    }
    // No target — fall through to solo
  }

  // ── Closing / closed → unmount ─────────────────────
  if (inspectorState === 'closing' || inspectorState === 'closed') {
    return null
  }

  // ── Solo view (default) ────────────────────────────
  return (
    <PersonSoloView
      person={personData}
      neighbors={safeNeighbors}
      entityName={entity.name}
      entityNodeId={entity.nodeId}
      isLoading={personLoading}
      tabsRef={tabsRef}
      onClose={handleClose}
      onTabChange={() => { /* tab state managed inside PersonSoloView via tabsRef */ }}
      onOpenRelation={handleOpenRelation}
    />
  )
}
