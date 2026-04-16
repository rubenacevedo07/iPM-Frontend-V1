import { useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AppActor } from './app.machine'

function RouterSync() {
  const search = useSearch({ from: '/workstation' })
  const actor  = AppActor.useActorRef()
  useEffect(() => {
    actor.send({ type: 'URL_CHANGED', search })
  }, [search, actor])
  return null
}

export function AppShell() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090b10' }}>
      <RouterSync />
      {/* Phase 2b: <EngineSlot /> */}
      {/* Phase 3:  <MapCinematicIntro /> */}
      {/* Phase 4:  <AppHeader /> */}
      {/* Phase 5-6: overlay condicional */}
    </div>
  )
}
