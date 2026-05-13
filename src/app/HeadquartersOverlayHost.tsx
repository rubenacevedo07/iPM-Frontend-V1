import { AppActor } from './app.machine'
import { HeadquartersView } from '@/features/headquarters-overlay/HeadquartersView'
import { useUIState } from './useUIState'
import { getOverlay } from './selectUIState'

/**
 * URL → HeadquartersView dispatcher. Active when the discriminated UIState
 * resolves to an overlay of kind 'hq' (either on globe or network).
 *
 * Day 3: payload comes from `useUIState()`. `selectUIState` already enforces
 * that both `personId` and `companyId` are `number` at the selector
 * boundary — degrading malformed URLs to `<view>-idle` — so the host doesn't
 * re-validate the ids. Closing the overlay routes back to /workstation via
 * the existing CLOSE_OVERLAY → navigateHome action chain in app.machine.
 */
export function HeadquartersOverlayHost() {
  const ui    = useUIState()
  const actor = AppActor.useActorRef()

  const overlay = getOverlay(ui)
  if (overlay?.kind !== 'hq') return null

  const { personId, companyId } = overlay
  return (
    <HeadquartersView
      personId={personId}
      companyId={companyId}
      onClose={() => actor.send({ type: 'CLOSE_OVERLAY' })}
    />
  )
}
