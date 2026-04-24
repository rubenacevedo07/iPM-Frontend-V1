import { useMachine, useSelector } from '@xstate/react'
import { useQuery } from '@tanstack/react-query'
import { personOverlayMachine } from './person-overlay.machine'
import { AppActor } from '@/app/AppProviders'
import { qk, fetchers } from '@/domain/queries'
import { CinematicTransition } from './CinematicTransition'
import { PersonSoloView } from './PersonSoloView'
import { StudioRelationView } from './StudioRelationView'
import { getScene } from './sceneMap'
import { elonMuskFallback, fallbackNeighbors } from './personFallbackData'
import type { EntityRef, EntityType, GraphNode } from '@/domain/types'

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

// Convert GraphNode (stored in inspector context) to EntityRef
function graphNodeToEntityRef(node: GraphNode): EntityRef {
  return nodeIdToEntityRef(node.id, node.name)
}

export function PersonOverlay({ entity }: PersonOverlayProps) {
  const appRef = AppActor.useActorRef()
  const [state, send] = useMachine(personOverlayMachine, {
    input: { entity },
  })

  const inspectorRef = state.context.inspectorRef
  const tabsRef      = state.context.tabsRef

  // Inspector state value — may be a nested object in parallel machines
  const inspectorState = useSelector(inspectorRef!, s => s?.value ?? 'closed')

  // Inspector context for relation target
  const relationTarget = useSelector(inspectorRef!, s => s?.context.relationTarget ?? null)

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
    const targetNode: GraphNode = {
      id: targetNodeId,
      label: targetName,
      name: targetName,
      type: 'person',   // best-effort; corrected from nodeId prefix if needed
      r: 16,
      priority: 1,
    }
    send({ type: 'RELATION.OPEN', target: targetNode })
  }

  // Use fallback data for known demo entities
  const personData = person ?? (entity.id === 5 || entity.id === 7 ? elonMuskFallback : undefined)

  // Use fallback neighbors whenever API errors or returns empty — regardless of entity id
  const safeNeighbors = (!neighborsError && neighbors?.nodes?.length)
    ? neighbors
    : fallbackNeighbors

  const scene = getScene(entity.id, entity.type, entity.name)

  // ── Opening cinematic ──────────────────────────────
  if (inspectorState === 'cinematic') {
    return (
      <CinematicTransition
        scene={scene}
        label={entity.name}
        onComplete={() => inspectorRef?.send({ type: 'CINEMATIC.COMPLETE' })}
      />
    )
  }

  // ── Relation cinematic ─────────────────────────────
  if (inspectorState === 'relationCinematic') {
    const targetEntity = relationTarget ? graphNodeToEntityRef(relationTarget) : null
    const relScene = targetEntity
      ? getScene(targetEntity.id, targetEntity.type, targetEntity.name)
      : null
    return (
      <CinematicTransition
        scene={relScene}
        label={targetEntity?.name ?? entity.name}
        onComplete={() => inspectorRef?.send({ type: 'CINEMATIC.COMPLETE' })}
      />
    )
  }

  // ── Relation view ──────────────────────────────────
  if (inspectorState === 'relation') {
    const entityB = relationTarget
      ? graphNodeToEntityRef(relationTarget)
      : null

    if (entityB && inspectorRef) {
      return (
        <StudioRelationView
          entityA={entity}
          entityB={entityB}
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
