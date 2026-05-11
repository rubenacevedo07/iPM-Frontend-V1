import { useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react'
import { AnimatePresence, motion, useMotionValue, animate } from 'framer-motion'
import { useSearch }  from '@tanstack/react-router'
import { AppActor }   from './app.machine'
import { EngineSlot } from '@/components/EngineSlot/EngineSlot'
import type { EngineSlotRefs } from '@/components/EngineSlot/EngineSlot'
import { useCompanies } from '@/hooks/useCompanies'
import { TopBar } from '@/components/TopBar/TopBar'
import { AtlasTabs } from '@/components/AtlasTabs/AtlasTabs'
import type { AtlasView } from '@/types/atlas'
import { SEARCH_THEMES } from '@/components/TopBar/searchThemes'
import { POWER_MAP_CONFIGS } from '@/engine/powermapData'
import {
  PersonOverlaySkeleton,
  CompanyOverlaySkeleton,
  GoldOverlaySkeleton,
  GraphSkeleton,
  PowerMapsSkeleton,
} from '@/components/SkeletonPanels/SkeletonPanels'

// Lazy: heavy feature panels — only mount when the matching atlasView/overlay is active.
// Pulls @xyflow/react, d3-force, framer-motion (overlay subtrees), flag-icons CSS, and the
// 12-service useCompanyData chain off the startup path (~2s of dev-mode parse).
const GraphViewPanel    = lazy(() => import('@/features/graph-view/GraphViewPanel').then(m => ({ default: m.GraphViewPanel })))
const WallStreetPage    = lazy(() => import('@/features/wall-street/WallStreetPage').then(m => ({ default: m.WallStreetPage })))
const CompanyOverlayHost = lazy(() => import('./CompanyOverlayHost').then(m => ({ default: m.CompanyOverlayHost })))
const PersonOverlayHost  = lazy(() => import('./PersonOverlayHost').then(m => ({ default: m.PersonOverlayHost })))
const GoldOverlayHost    = lazy(() => import('./GoldOverlayHost').then(m => ({ default: m.GoldOverlayHost })))
const PowerMapsPanel     = lazy(() => import('@/features/gold-overlay/PowerMapsPanel').then(m => ({ default: m.PowerMapsPanel })))

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
  const query          = AppActor.useSelector(s => s.context.query)
  const requestSentRef = useRef(false)

  const isWallStreet = query.trim().toLowerCase() === 'wall street'

  // Cinematic transition: globe zooms-in and fades out when switching to graph.
  // useMotionValue stays stable across renders — no re-render on value change.
  const globeOpacity = useMotionValue(1)
  const globeScale   = useMotionValue(1)

  useEffect(() => {
    if (atlasView === 'network') {
      void animate(globeOpacity, 0,    { duration: 0.5, ease: 'easeIn' })
      void animate(globeScale,   1.06, { duration: 0.5, ease: 'easeIn' })
    } else {
      void animate(globeOpacity, 1,    { duration: 0.4, ease: 'easeOut', delay: 0.1 })
      void animate(globeScale,   1,    { duration: 0.4, ease: 'easeOut', delay: 0.1 })
    }
  }, [atlasView, globeOpacity, globeScale])

  const handleRefsReady = useCallback((refs: EngineSlotRefs) => {
    engineSlotsRef.current = refs
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

  const search      = useSearch({ from: '/workstation' })
  const isGoldOpen  = search.overlay === 'gold'
  const isPersonOpen = search.overlay === 'person'

  // Gold overlay: shrink canvas to the free area not covered by its floating panels.
  // Person overlay: side panels (left 280px + right 300px) float over the globe — canvas stays full-size.
  const graphInset = isGoldOpen
    ? { left: 280, top: 0, right: 268, bottom: 210 }
    : { left: 0,   top: 0, right: 0,   bottom: 0   }

  // Phase 9 (GATE C): release deck.gl / WebGL when the user leaves the page (tab
  // close, external nav). Only window unload hooks — not React unmount (StrictMode
  // in dev would otherwise dispose the engine on the synthetic double-mount).
  const unloadDisposeSentRef = useRef(false)
  useEffect(() => {
    const onPageLeave = () => {
      if (unloadDisposeSentRef.current) return
      unloadDisposeSentRef.current = true
      engineRef.send({ type: 'ENGINE.DISPOSE' })
    }
    window.addEventListener('pagehide', onPageLeave)
    window.addEventListener('beforeunload', onPageLeave)
    return () => {
      window.removeEventListener('pagehide', onPageLeave)
      window.removeEventListener('beforeunload', onPageLeave)
    }
  }, [engineRef])

  // Phase 4.1: push top-50 companies by marketCap to the globe once loaded.
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

    // Phase 7: 30 company dots
    const top30 = sorted.slice(0, 30).map((c, i) => ({
      id:           c.id,
      nodeId:       `company:${c.id}`,
      type:         'COMPANY' as const,
      slug:         c.name.toLowerCase().replace(/\s+/g, '-'),
      name:         c.name,
      latitude:     c.latitude,
      longitude:    c.longitude,
      marketCapUsd: c.marketCapUsd,
      isChokepoint: c.isChokepoint ?? false,
      isGold:       i < 15,
    }))

    engineRef.send({ type: 'CMD.SET_ENTITIES', data: { entities: top30 } })
  }, [companies, companiesLoading, engineRef])

  const activePowermapId = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SEARCH_THEMES.find(t => t.label.toLowerCase() === q)?.id ?? null
  }, [query])

  useEffect(() => {
    engineRef.send({ type: 'CMD.SET_POWERMAP', powermapId: activePowermapId })
  }, [activePowermapId, engineRef])

  useEffect(() => {
    if (!activePowermapId) return
    const cfg = POWER_MAP_CONFIGS[activePowermapId]
    if (!cfg?.flyTo) return
    engineRef.send({
      type:      'CMD.FLY_TO',
      longitude: cfg.flyTo.longitude,
      latitude:  cfg.flyTo.latitude,
      zoom:      cfg.flyTo.zoom,
      duration:  2000,
    })
  }, [activePowermapId, engineRef])

  // INVARIANT — Rule 7 (user-requested, permanent): rotation MUST be disabled whenever
  // a target is selected. Do NOT add conditions that re-enable rotation while a powermap
  // or overlay is active. After cinematic fly-to the globe must stay on the selected entity.
  const shouldRotate = !activePowermapId && !isGoldOpen && !isPersonOpen && search.overlay !== 'company'
  useEffect(() => {
    engineRef.send({ type: 'CMD.SET_ROTATION', enabled: shouldRotate })
  }, [shouldRotate, engineRef])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000000', display: 'flex', flexDirection: 'column' }}>
      <TopBar />
      <main style={{ flex: 1, position: 'relative', minHeight: 0 }}>
      <RouterSync />

      {/* Globe — always mounted; cinematic zoom+fade driven by useMotionValue.
          Container shrinks to the free area when an overlay is open so the
          sphere re-centers in the visible space (same insets as the graph). */}
      <motion.div
        style={{
          opacity: globeOpacity,
          scale:   globeScale,
          position: 'absolute',
          top:    graphInset.top,
          left:   graphInset.left,
          right:  graphInset.right,
          bottom: graphInset.bottom,
          transition: 'top 0.35s ease, left 0.35s ease, right 0.35s ease, bottom 0.35s ease',
        }}
      >
        <EngineSlot actorRef={engineRef} onRefsReady={handleRefsReady} />
      </motion.div>

      {/* ReactFlow graph — fades in with 300ms delay so globe dissolves first */}
      <AnimatePresence>
        {atlasView === 'network' && (
          <motion.div
            key="graph-panel"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top:    graphInset.top,
              left:   graphInset.left,
              right:  graphInset.right,
              bottom: graphInset.bottom,
              zIndex: 10,
              transition: 'top 0.35s ease, left 0.35s ease, right 0.35s ease, bottom 0.35s ease',
            }}
          >
            <Suspense fallback={<GraphSkeleton />}>
              {isWallStreet ? <WallStreetPage /> : <GraphViewPanel />}
            </Suspense>
          </motion.div>
        )}
        {atlasView === 'persons' && (
          <motion.div
            key="persons-panel"
            style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <PersonViewPanel />
          </motion.div>
        )}
        {atlasView === 'relation' && (
          <motion.div
            key="relation-panel"
            style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <RelationViewPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating view tabs — centered at the top of the canvas.
          Placed after globe + graph in DOM so the framer-motion stacking
          context never blocks pointer events. */}
      <div style={{
        position: 'absolute',
        top: 4,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 35,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 8,
      }}>
        <AtlasTabs
          activeView={atlasView}
          onTabClick={t => {
            if (t.action === 'studio-relation') {
              actor.send({ type: 'OPEN_PERSON', id: 7 })
            } else if (t.action === 'wall-street') {
              actor.send({ type: 'WALL_STREET.OPEN' })
            } else {
              actor.send({ type: 'ATLAS_VIEW.SET', view: t.view as AtlasView })
            }
          }}
        />
      </div>

      {/* Power Maps panel — visible over both globe and network views.
          Hidden when an entity overlay (person/gold/company) is open. */}
      {!isGoldOpen && !isPersonOpen && search.overlay !== 'company' && (
        <div
          style={{
            position: 'absolute',
            top: 56,
            left: 20,
            width: 240,
            zIndex: 25,
            pointerEvents: 'auto',
          }}
        >
          <Suspense fallback={<PowerMapsSkeleton />}>
            <PowerMapsPanel />
          </Suspense>
        </div>
      )}

      {/* Overlay hosts — all three share a single AnimatePresence (mode="sync",
          the default) so outgoing and incoming overlays cross-fade simultaneously.
          This prevents the black flash that occurred when switching company→gold:
          with mode="wait" the outgoing overlay faded out 0.22s before gold could
          mount, exposing the black page background. mode="sync" keeps both alive
          during the transition so combined opacity never drops to 0. */}
      <AnimatePresence>
        {search.overlay === 'company' && (
          <motion.div
            key="overlay-company"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeIn' }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
          >
            <Suspense fallback={<CompanyOverlaySkeleton />}><CompanyOverlayHost /></Suspense>
          </motion.div>
        )}
        {isPersonOpen && (
          <motion.div
            key="overlay-person"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeIn' }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
          >
            <Suspense key="person-host" fallback={<PersonOverlaySkeleton />}><PersonOverlayHost /></Suspense>
          </motion.div>
        )}
        {isGoldOpen && (
          <motion.div
            key="overlay-gold"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
          >
            <Suspense fallback={<GoldOverlaySkeleton />}><GoldOverlayHost /></Suspense>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * NOTA HISTÓRICA — Video transición globo→network (eliminado)
 *
 * Hubo una capa de video cinematográfico que se reproducía al cambiar
 * atlasView de cualquier valor a 'network'. Eliminada porque interrumpía el
 * flujo de UX. Implementación previa, por si se desea restaurar:
 *
 * 1) State + refs:
 *    const [showVideo, setShowVideo] = useState(false)
 *    const prevAtlasView = useRef(atlasView)
 *    const videoRef      = useRef<HTMLVideoElement>(null)
 *
 * 2) Trigger en transición (cualquier vista) → 'network':
 *    useEffect(() => {
 *      if (prevAtlasView.current !== 'network' && atlasView === 'network') {
 *        setShowVideo(true)
 *        if (videoRef.current) {
 *          videoRef.current.currentTime = 0
 *          videoRef.current.play().catch(() => {})
 *        }
 *      }
 *      prevAtlasView.current = atlasView
 *    }, [atlasView])
 *
 * 3) Overlay siempre montado (preload), toggle por visibility para no
 *    re-fetchear el asset. z-index 20: encima del grafo (10) y globo,
 *    debajo de los overlays de entidad (50). Auto-cierre al terminar:
 *    <div style={{
 *      position: 'absolute', inset: 0, zIndex: 20, background: '#000',
 *      visibility: showVideo ? 'visible' : 'hidden',
 *      pointerEvents: showVideo ? 'auto' : 'none',
 *    }}>
 *      <video
 *        ref={videoRef}
 *        src="/MainVideo.mp4"
 *        preload="auto"
 *        playsInline
 *        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
 *        onEnded={() => setShowVideo(false)}
 *      />
 *    </div>
 *
 * Asset esperado en /public/MainVideo.mp4 (presente en el repo, no se borró).
 * ──────────────────────────────────────────────────────────────────────────── */
