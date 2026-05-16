import { useEffect, useRef, useCallback, useMemo, useState, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearch }  from '@tanstack/react-router'
import { useSelector } from '@xstate/react'
import { AppActor }   from './app.machine'
import { useUIState } from './useUIState'
import { getOverlay, isOverlayOpen } from './selectUIState'
import { useShouldRotate } from './useShouldRotate'
import { EngineSlot } from '@/components/EngineSlot/EngineSlot'
import type { EngineSlotRefs } from '@/components/EngineSlot/EngineSlot'
import { usePersonsMap } from '@/hooks/usePersonsMap'
import { haversineKm, placePersonDot } from '@/utils/geoDistance'
import { TopBar } from '@/components/TopBar/TopBar'
import { AtlasTabs } from '@/components/AtlasTabs/AtlasTabs'
import type { AtlasView } from '@/types/atlas'
import { SEARCH_THEMES } from '@/components/TopBar/searchThemes'
import { POWER_MAP_CONFIGS } from '@/engine/powermapData'

// Day 4+: GraphSkeleton (and the rest of SkeletonPanels) was removed at user
// request — the full-width dark bands in the skeleton were reading as a
// persistent "shadow" behind the overlay panels. The Suspense boundaries
// around the lazy-loaded graph + relation panels now fall back to `null`,
// so the area just stays empty over the globe until the chunk + its data
// resolve (typically sub-frame on a warm cache). If we need a loading hint
// in the future, put it INSIDE the panel chunk so it doesn't render until
// the chunk is at least parsed.

// Lazy: heavy feature panels — only mount when the matching atlasView/overlay is active.
// Pulls @xyflow/react, d3-force, framer-motion (overlay subtrees), flag-icons CSS, and the
// 12-service useCompanyData chain off the startup path (~2s of dev-mode parse).
const GraphViewPanel     = lazy(() => import('@/features/graph-view/GraphViewPanel').then(m => ({ default: m.GraphViewPanel })))
const CompanyOverlayHost  = lazy(() => import('./CompanyOverlayHost').then(m => ({ default: m.CompanyOverlayHost })))
const GoldOverlayHost     = lazy(() => import('./GoldOverlayHost').then(m => ({ default: m.GoldOverlayHost })))
const PowerMapOverlayHost   = lazy(() => import('./PowerMapOverlayHost').then(m => ({ default: m.PowerMapOverlayHost })))
const HeadquartersOverlayHost = lazy(() => import('./HeadquartersOverlayHost').then(m => ({ default: m.HeadquartersOverlayHost })))
const PowerMapsPanel        = lazy(() => import('@/features/gold-overlay/PowerMapsPanel').then(m => ({ default: m.PowerMapsPanel })))
const RelationViewPanel     = lazy(() => import('@/features/relation-view/RelationViewPanel').then(m => ({ default: m.RelationViewPanel })))

// Curated logo icons for the globe IconLayer. Only these companies show a logo;
// every other entity falls back to the cyan/gold dot from globe-rings/globe-dots.
// Source files: public/deckgl/*.webp (64x64 with alpha — see deck-gl-icon-layer skill).
const DECKGL_ICONS: Record<string, string> = {
  'Apple': '/deckgl/Apple.webp',
  'CATL':  '/deckgl/Catl.webp',
  'TSMC':  '/deckgl/Tsmc.webp',
  'ASML':  '/deckgl/asml.webp',
  'ICBC':  '/logos/icbc.jpeg',
}

// Shape of /data/top30.json — already engine-payload-ready (no Company mapping needed).
interface Top30Entry {
  id:            number
  nodeId:        string
  type:          'COMPANY'
  slug:          string
  name:          string
  latitude:      number
  longitude:     number
  marketCapUsd:  number
  isChokepoint?: boolean
}

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
  const requestSentRef  = useRef(false)
  const engineSlotsRef  = useRef<EngineSlotRefs | null>(null)
  // Alternating slot ref: first ENGINE.SWAP uses slotA (globe starts in slotB).
  // Flips on every swap so incoming engine always mounts in the hidden slot.
  const swapSlotRef     = useRef<'a' | 'b'>('a')
  const prevAtlasRef    = useRef<typeof atlasView | null>(null)

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

  // ENGINE.SWAP — designed (Sprint 2) to swap between globe (deck.gl) and the
  // Three.js GraphEngine when atlasView toggles globe ↔ network.
  //
  // INTENTIONAL DISABLE — Three.js GraphEngine is paused while the ReactFlow
  // graph (src/features/graph-view/GraphViewPanel) drives the visible Network
  // view. The SWAP machinery, GraphBridge, graph.worker.ts, EngineSlot
  // alternation and the engineManager.machine crossfade are all preserved.
  // To re-enable Three.js as the Network engine in the future, drop the
  // `THREEJS_GRAPH_ENGINE_ENABLED` flag below. No other change is required:
  // the SWAP effect body and the opacity gate on the ReactFlow panel below
  // are both keyed off this constant.
  const THREEJS_GRAPH_ENGINE_ENABLED = false

  useEffect(() => {
    if (prevAtlasRef.current === atlasView) return
    const prev = prevAtlasRef.current
    prevAtlasRef.current = atlasView

    // Don't swap on initial mount — globe was already requested via handleRefsReady.
    if (prev === null) return
    if (!engineSlotsRef.current) return

    if (!THREEJS_GRAPH_ENGINE_ENABLED) return  // Three.js disabled — see flag above.

    const isGlobeNetwork = atlasView === 'network' || atlasView === 'globe'
    const wasGlobeNetwork = prev === 'network' || prev === 'globe'
    if (!isGlobeNetwork && !wasGlobeNetwork) return  // other views don't use EngineManager

    const engineId = atlasView === 'network' ? 'graph' : 'globe'
    const slot     = swapSlotRef.current
    const container = slot === 'a' ? engineSlotsRef.current.slotA : engineSlotsRef.current.slotB

    engineRef.send({
      type:     'ENGINE.SWAP',
      engineId,
      input:    { container, view: atlasView },
    })
    // Alternate for the next swap
    swapSlotRef.current = slot === 'a' ? 'b' : 'a'
  }, [atlasView, engineRef])

  const { persons } = usePersonsMap()

  // Top-30 companies for the globe — served as a static asset from public/data/.
  // Replaces the previous API call to /api/companies/top30. Shape is already the
  // engine payload (no Company→entity mapping needed).
  const [top30Data, setTop30Data] = useState<Top30Entry[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/data/top30.json')
      .then(r => r.json() as Promise<Top30Entry[]>)
      .then(arr => { if (!cancelled) setTop30Data(arr) })
      .catch(err => console.error('[AppShell] failed to load /data/top30.json', err))
    return () => { cancelled = true }
  }, [])

  const search      = useSearch({ from: '/workstation' })

  // Day 3 — the discriminated UIState is the single source of truth for both
  // the rotation gate (via `useShouldRotate()`) and overlay-host visibility
  // (predicates below narrow on `overlay.kind`). The four named booleans
  // that lived here in Day 2 (`isGoldOpen`, `isCompanyOpen`, `isHqOpen`,
  // `isPowerMapOverlayOpen`) are retired — every render site now branches
  // directly on the union, so adding a new overlay kind is a compile error
  // until each consumer opts in or out explicitly.
  const ui = useUIState()
  const overlay = getOverlay(ui)

  // Globe stays full-viewport regardless of overlay state. Overlays float on top
  // as glass panels. Prior design shrunk the canvas behind gold via `graphInset`,
  // but the CSS transition desynchronized from the panel framer animations,
  // exposing the page background during overlay transitions. Keeping `inset: 0`
  // means the globe is always behind every panel — no exposed black.

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

  // Phase 4.1 + persons: push companies (top 30 by marketCap, from static JSON)
  // and persons (top 15 by compositeScore) to the globe. Both arrays are memoized
  // so their object identity is stable — the effect only fires when the source data
  // actually changes, and the engine skips the SET_ENTITIES send on unrelated renders.
  const top30 = useMemo(() => {
    if (!top30Data) return null
    return top30Data.slice(0, 30).map((c, i) => ({
      id:           c.id,
      nodeId:       c.nodeId,
      type:         c.type,
      slug:         c.slug,
      name:         c.name,
      latitude:     c.latitude,
      longitude:    c.longitude,
      marketCapUsd: c.marketCapUsd,
      isChokepoint: c.isChokepoint ?? false,
      isGold:       i < 15,
      iconUrl:      DECKGL_ICONS[c.name],
    }))
  }, [top30Data])

  const top15persons = useMemo(() => {
    if (!top30) return null
    return persons
      .filter(p => p.countryLat != null && p.countryLng != null)
      .map(p => {
        // Pre-tag colocated company by name match + ≤50 km haversine distance.
        const colocated = p.companyName
          ? top30.find(c =>
              c.name === p.companyName &&
              haversineKm(p.countryLat!, p.countryLng!, c.latitude, c.longitude) <= 50,
            )
          : undefined

        // Place person within their country, avoiding company HQ positions.
        // golden-angle spread (137.5° per id) guarantees no two persons from
        // the same country stack, and the clearance check pushes the dot away
        // from any nearby company HQ.
        const pos = placePersonDot(p.id, p.countryLat!, p.countryLng!, top30)

        return {
          id:        p.id,
          nodeId:    p.nodeId,
          type:      'PERSON' as const,
          slug:      p.slug,
          name:      p.fullName,
          latitude:  pos.lat,
          longitude: pos.lng,
          photoUrl:  p.photoUrl ?? null,
          coLocatedCompanyId: colocated?.id,
        }
      })
  }, [top30, persons])

  // Persons FIRST, companies LAST: deck.gl draws in array order, picker
  // returns the topmost (last-drawn) at overlapping positions. Companies
  // (cyan) end up on top of any colocated persons (gold) — clicking a
  // visible cyan dot picks the company, not the person underneath.
  useEffect(() => {
    if (!top30 || !top15persons) return
    engineRef.send({ type: 'CMD.SET_ENTITIES', data: { entities: [...top15persons, ...top30] } })
  }, [top30, top15persons, engineRef])

  const activePowermapId = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SEARCH_THEMES.find(t => t.label.toLowerCase() === q)?.id ?? null
  }, [query])

  useEffect(() => {
    engineRef.send({ type: 'CMD.SET_POWERMAP', powermapId: activePowermapId })
  }, [activePowermapId, engineRef])

  // INVARIANT — Rule 7 (user-requested, permanent): rotation MUST be disabled whenever
  // a target is selected. Do NOT add conditions that re-enable rotation while a powermap
  // or overlay is active. After cinematic fly-to the globe must stay on the selected entity.
  //
  // ORDERING: this effect MUST fire BEFORE the CMD.FLY_TO effect below. The
  // GlobeBridge handler for CMD.SET_ROTATION { enabled: false } sets
  // `_flyToCancelled = true` to freeze any in-flight cinematic (Rule 7).
  // If SET_ROTATION ran AFTER FLY_TO on the same activePowermapId tick, it
  // would cancel the freshly-started fly-to. The fly-to handler resets
  // `_flyToCancelled = false` on entry, so the safe order is:
  //   1. SET_POWERMAP   (layers)
  //   2. SET_ROTATION   (stop rotation, mark cancel)
  //   3. FLY_TO         (reset cancel, start cinematic)
  //
  // Day 3: the rotation formula moved into `useShouldRotate()`. The hook is
  // the single rotation-decision site and the only automated guarantee of
  // Rule 7 (see src/app/useShouldRotate.test.ts). The flat conjunction
  // previously declared inline survives bit-identically inside
  // `computeShouldRotate` — the only change is locality.
  const shouldRotate = useShouldRotate()
  useEffect(() => {
    engineRef.send({ type: 'CMD.SET_ROTATION', enabled: shouldRotate })
  }, [shouldRotate, engineRef])

  useEffect(() => {
    if (!search.overlay) {
      engineRef.send({ type: 'CMD.SET_FOCUS', target: null })
    }
  }, [search.overlay, engineRef])

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

  // URL-driven power-map overlay: when ?powermapId=... opens the overlay,
  // also drive the globe (set the layer + fly-to). Mirrors the query-driven
  // path above but keyed on the URL so back/forward navigation works.
  useEffect(() => {
    if (!search.powermapId) return
    engineRef.send({ type: 'CMD.SET_POWERMAP', powermapId: search.powermapId })
    const cfg = POWER_MAP_CONFIGS[search.powermapId]
    if (cfg?.flyTo) {
      engineRef.send({
        type:      'CMD.FLY_TO',
        longitude: cfg.flyTo.longitude,
        latitude:  cfg.flyTo.latitude,
        zoom:      cfg.flyTo.zoom,
        duration:  2000,
      })
    }
  }, [search.powermapId, engineRef])

  // Warm cache for the heavy chunks (graph view, overlay hosts). Triggers
  // ONLY after the engine reaches `active` (globe first paint done) and then
  // at the next browser idle. This prevents the preload from competing with
  // deck.gl during cold start — see docs/strategy/perf-diagnosis.md TOP-5 #2.
  // requestIdleCallback falls back to a short setTimeout on Safari < 17.
  const engineActive = useSelector(engineRef, snap => snap.matches('active'))
  const preloadedRef = useRef(false)
  useEffect(() => {
    if (!engineActive) return
    if (preloadedRef.current) return
    preloadedRef.current = true

    const preload = () => {
      void import('@/features/graph-view/GraphViewPanel')
      void import('./GoldOverlayHost')
      void import('./CompanyOverlayHost')
      void import('./HeadquartersOverlayHost')
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number
    }
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(preload, { timeout: 2000 })
    } else {
      window.setTimeout(preload, 1500)
    }
  }, [engineActive])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000000', display: 'flex', flexDirection: 'column' }}>
      <TopBar />
      <main style={{ flex: 1, position: 'relative', minHeight: 0 }}>
      <RouterSync />

      {/* EngineSlot — always full-viewport. Owns its own slot-A/slot-B crossfade
          via CSS transition + engineManager.machine activeSlot. No outer opacity
          animation needed; the internal 400ms CSS transition handles globe↔graph. */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <EngineSlot actorRef={engineRef} onRefsReady={handleRefsReady} />
      </div>

      {/* ReactFlow graph panel — visible when atlasView === 'network'. Always
          mounted so @xyflow/react state (zoom, hover, selection) survives view
          switches and the heavy chunk only parses once. Opacity + pointer-events
          gate visibility/interactivity; the globe behind keeps rendering but is
          covered by ReactFlow's opaque canvas at opacity 1.
          NOTE — paired with the THREEJS_GRAPH_ENGINE_ENABLED flag in the swap
          effect above. While that flag is false, this is the canonical Network
          view. Flip the flag (and revert this gate to `opacity: 0; pointer-
          events: none`) to hand Network back to the Three.js GraphEngine. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          opacity: atlasView === 'network' ? 1 : 0,
          pointerEvents: atlasView === 'network' ? 'auto' : 'none',
          transition: 'opacity 0.4s ease',
        }}
      >
        <Suspense fallback={null}>
          <GraphViewPanel />
        </Suspense>
      </div>

      <AnimatePresence>
        {atlasView === 'relation' && (
          <motion.div
            key="relation-panel"
            style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Suspense fallback={null}>
              <RelationViewPanel />
            </Suspense>
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
        zIndex: 80,
        pointerEvents: 'auto',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 8,
      }}>
        <AtlasTabs
          activeView={atlasView}
          onTabClick={t => {
            actor.send({ type: 'ATLAS_VIEW.SET', view: t.view as AtlasView })
          }}
        />
      </div>

      {/* Power Maps panel — visible over both globe and network views.
          Hidden whenever any overlay is open (Day 3: `isOverlayOpen(ui)` is
          the canonical gate; covers globe-overlay AND network-overlay
          variants in one check). */}
      {!isOverlayOpen(ui) && (
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
          <Suspense fallback={null}>
            <PowerMapsPanel />
          </Suspense>
        </div>
      )}

      {/* Overlay hosts — one shared AnimatePresence (sync mode, the default).
          All variants use IDENTICAL animation specs so cross-fades never
          have a desynchronized frame. The globe (always full-viewport
          behind these) is the visual backdrop — black background is never
          exposed.

          Day 3: predicates narrow on the discriminated `overlay` payload.
          Optional-chained equality (`overlay?.kind === 'X'`) is a TS type
          guard inside the `&&` branch, so the `motion.div` key can read
          `overlay.id` / `overlay.personId` without re-narrowing. */}
      <AnimatePresence>
        {overlay?.kind === 'company' && (
          <motion.div
            key={`overlay-company-${overlay.id}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
          >
            <Suspense fallback={null}><CompanyOverlayHost /></Suspense>
          </motion.div>
        )}
        {overlay?.kind === 'gold' && (
          <motion.div
            key={`overlay-gold-${overlay.id}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
          >
            <Suspense fallback={null}><GoldOverlayHost /></Suspense>
          </motion.div>
        )}
        {overlay?.kind === 'hq' && (
          <motion.div
            key={`overlay-hq-${overlay.personId}-${overlay.companyId}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
          >
            <Suspense fallback={null}><HeadquartersOverlayHost /></Suspense>
          </motion.div>
        )}
        {overlay?.kind === 'powermap' && (
          <motion.div
            key={`overlay-powermap-${overlay.id}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
          >
            <Suspense fallback={null}><PowerMapOverlayHost /></Suspense>
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
