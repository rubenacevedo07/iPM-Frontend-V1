import { useEffect, useRef, useCallback } from 'react'
import { useSearch }  from '@tanstack/react-router'
import { AppActor }   from './app.machine'
import { EngineSlot } from '@/components/EngineSlot/EngineSlot'
import type { EngineSlotRefs } from '@/components/EngineSlot/EngineSlot'
import { OverlayPanel } from '@/components/OverlayPanel/OverlayPanel'
import { useCompanies } from '@/hooks/useCompanies'

function RouterSync() {
  const search = useSearch({ from: '/workstation' })
  const actor  = AppActor.useActorRef()
  useEffect(() => {
    actor.send({ type: 'URL_CHANGED', search })
  }, [search, actor])
  return null
}

export function AppShell() {
  const actor          = AppActor.useActorRef()
  const engineRef      = AppActor.useSelector(s => s.context.engineManagerRef)
  const atlasView      = AppActor.useSelector(s => s.context.atlasView)
  const requestSentRef = useRef(false)

  useEffect(() => {
    const sub = actor.subscribe((snap) => {
      const engineSnap = engineRef.getSnapshot()
    })
    return () => sub.unsubscribe()
  }, [actor, engineRef])

  const handleRefsReady = useCallback((refs: EngineSlotRefs) => {
    if (requestSentRef.current) {
      return
    }
    requestSentRef.current = true
    engineRef.send({
      type:     'ENGINE.REQUEST',
      engineId: 'globe',
      input:    { container: refs.slotB, view: atlasView },
    })
  }, [engineRef, atlasView])

  const { companies, loading: companiesLoading } = useCompanies()

  // Phase 4.1: push top-50 companies by marketCap to the globe once loaded.
  // Rows are shaped as EntityRef + coords so that GlobeBridge.onClick produces
  // an ENGINE.ENTITY_CLICK whose entity satisfies app.machine's
  // `entity.type === 'COMPANY'` guard (see ADR / Blocker 2 fix).
  useEffect(() => {
    if (companiesLoading || companies.length === 0) return

    const valid = companies.filter(
      c => typeof c.latitude === 'number' && typeof c.longitude === 'number',
    )

    const sorted = [...valid].sort((a, b) => {
      const aCap = a.marketCapUsd ?? -1
      const bCap = b.marketCapUsd ?? -1
      return bCap - aCap
    })

    const top50 = sorted.slice(0, 50).map(c => ({
      id:           c.id,
      nodeId:       `company-${c.id}`,
      type:         'COMPANY' as const,
      slug:         c.name.toLowerCase().replace(/\s+/g, '-'),
      name:         c.name,
      latitude:     c.latitude,
      longitude:    c.longitude,
      marketCapUsd: c.marketCapUsd,
      isChokepoint: c.isChokepoint ?? false,
    }))

    engineRef.send({ type: 'CMD.SET_ENTITIES', data: { entities: top50 } })
  }, [companies, companiesLoading, engineRef])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090b10', position: 'relative' }}>
      <RouterSync />
      <EngineSlot actorRef={engineRef} onRefsReady={handleRefsReady} />
      <OverlayPanel />
    </div>
  )
}
