import { lazy, Suspense, useMemo, type ComponentType } from 'react'
import { AppActor } from './app.machine'
import { POWER_MAP_CONFIGS } from '@/engine/powermapData'
import { PowerMapOverlay } from '@/features/powermap-overlay/PowerMapOverlay'
import { POWER_MAP_OVERLAY_CONTENT } from '@/features/powermap-overlay/powerMapContent'
import { useUIState } from './useUIState'
import { getOverlay } from './selectUIState'

/**
 * View-aware powermap dispatcher.
 *
 * - atlasView === 'network' AND config.networkComponent → mount the powermap-
 *   specific graph component (e.g. Wall Street → WallStreetPage). The chunk
 *   is lazy-loaded so it only ships when the powermap is opened.
 * - Otherwise (globe tab, OR network tab without a networkComponent) → mount
 *   the didactic <PowerMapOverlay> panel above the canvas. This is the
 *   fallback for powermaps that haven't been wired with a graph yet
 *   (Hormuz, Taiwan, ...) — they keep a contextual UI in the network view.
 *
 * The URL (`?overlay=powermap&powermapId=X`) drives both branches and the
 * globe layers (CMD.SET_POWERMAP/FLY_TO dispatched by AppShell).
 *
 * Day 3: payload comes from `useUIState()`; `atlasView` is still read
 * directly from the machine because the dispatch branch depends on the
 * current view, which is orthogonal to overlay-payload validity and
 * intentionally NOT folded into the union (see day3-plan.md § Per-host
 * nuances).
 */
export function PowerMapOverlayHost() {
  const ui        = useUIState()
  const actor     = AppActor.useActorRef()
  const atlasView = AppActor.useSelector(s => s.context.atlasView)

  const overlay = getOverlay(ui)
  if (overlay?.kind !== 'powermap') return null

  const cfg = POWER_MAP_CONFIGS[overlay.id]
  if (!cfg) return null

  if (atlasView === 'network' && cfg.networkComponent) {
    return <PowerMapNetworkMount loader={cfg.networkComponent} />
  }

  const content = POWER_MAP_OVERLAY_CONTENT[overlay.id]
  if (!content) return null
  return <PowerMapOverlay content={content} onClose={() => actor.send({ type: 'CLOSE_OVERLAY' })} />
}

/**
 * Lazy-mounts the powermap's `networkComponent` inside a Suspense boundary.
 * `useMemo([loader])` is critical: re-creating `lazy()` each render would
 * break React's lazy cache and re-trigger the dynamic import on every
 * re-render, defeating the chunk caching.
 */
// Day 4+: SkeletonPanels removed at user request — Suspense falls back to
// `null` so the network view stays empty over the globe until the chunk
// loads. See AppShell.tsx for the broader rationale.
function PowerMapNetworkMount({ loader }: { loader: () => Promise<{ default: ComponentType }> }) {
  const Component = useMemo(() => lazy(loader), [loader])
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  )
}
