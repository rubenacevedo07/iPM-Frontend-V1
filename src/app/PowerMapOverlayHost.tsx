import { useSearch } from '@tanstack/react-router'
import { AppActor } from './app.machine'
import { PowerMapOverlay } from '@/features/powermap-overlay/PowerMapOverlay'
import { POWER_MAP_OVERLAY_CONTENT } from '@/features/powermap-overlay/powerMapContent'

export function PowerMapOverlayHost() {
  const search = useSearch({ from: '/workstation' })
  const actor  = AppActor.useActorRef()

  if (search.overlay !== 'powermap' || !search.powermapId) return null
  const content = POWER_MAP_OVERLAY_CONTENT[search.powermapId]
  if (!content) return null

  return <PowerMapOverlay content={content} onClose={() => actor.send({ type: 'CLOSE_OVERLAY' })} />
}
