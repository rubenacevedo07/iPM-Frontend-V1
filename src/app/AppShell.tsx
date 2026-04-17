import { useEffect, useRef, useCallback } from 'react'
import { useSearch }  from '@tanstack/react-router'
import { AppActor }   from './app.machine'
import { EngineSlot } from '@/components/EngineSlot/EngineSlot'
import type { EngineSlotRefs } from '@/components/EngineSlot/EngineSlot'

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

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090b10', position: 'relative' }}>
      <RouterSync />
      <EngineSlot actorRef={engineRef} onRefsReady={handleRefsReady} />
    </div>
  )
}
