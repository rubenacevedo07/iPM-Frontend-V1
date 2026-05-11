import { useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion, useMotionValue, animate } from 'framer-motion'
import { useSearch }  from '@tanstack/react-router'
import { AppActor }   from './app.machine'
import { EngineSlot } from '@/components/EngineSlot/EngineSlot'
import type { EngineSlotRefs } from '@/components/EngineSlot/EngineSlot'
import { CompanyOverlayHost } from './CompanyOverlayHost'
import { PersonOverlayHost } from './PersonOverlayHost'
import { useCompanies } from '@/hooks/useCompanies'
import { GraphViewPanel } from '@/features/graph-view/GraphViewPanel'
import { PersonViewPanel } from '@/features/person-view/PersonViewPanel'
import { RelationViewPanel } from '@/features/relation-view/RelationViewPanel'
import { AtlasViewToggle } from '@/components/AtlasViewToggle/AtlasViewToggle'
import type { AtlasView } from '@/types/atlas'
import styles from './AppShell.module.scss'

const CINEMATIC_MS = 360

function RouterSync() {
  const search = useSearch({ from: '/workstation' })
  const actor  = AppActor.useActorRef()
  useEffect(() => {
    actor.send({ type: 'URL_CHANGED', search })
  }, [search, actor])
  return null
}

export function AppShell() {
  const appRef           = AppActor.useActorRef()
  const engineRef        = AppActor.useSelector(s => s.context.engineManagerRef)
  const atlasView        = AppActor.useSelector(s => s.context.atlasView)
  const requestSentRef   = useRef(false)
  const engineSlotsRef   = useRef<EngineSlotRefs | null>(null)
  const cinematicShroudRef = useRef<HTMLDivElement | null>(null)
  const cinematicBusyRef   = useRef(false)

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

  const globeOpacity = useMotionValue(1)
  const globeScale   = useMotionValue(1)

  useEffect(() => {
    if (atlasView === 'network' || atlasView === 'persons' || atlasView === 'relation') {
      animate(globeOpacity, 0,    { duration: 0.35, ease: 'easeOut' })
      animate(globeScale,   1.06, { duration: 0.35, ease: 'easeOut' })
    } else {
      animate(globeOpacity, 1,    { duration: 0.35, ease: 'easeOut' })
      animate(globeScale,   1,    { duration: 0.35, ease: 'easeOut' })
    }
  }, [atlasView, globeOpacity, globeScale])

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

    // Phase 7: 30 company dots — scope discipline (P.C decision:
    // persons skipped until backend /api/persons/with-location exists).
    const top30 = sorted.slice(0, 30).map(c => ({
      id:           c.id,
      nodeId:       `company:${c.id}`,
      type:         'COMPANY' as const,
      slug:         c.name.toLowerCase().replace(/\s+/g, '-'),
      name:         c.name,
      latitude:     c.latitude,
      longitude:    c.longitude,
      marketCapUsd: c.marketCapUsd,
      isChokepoint: c.isChokepoint ?? false,
    }))

    engineRef.send({ type: 'CMD.SET_ENTITIES', data: { entities: top30 } })
  }, [companies, companiesLoading, engineRef])

  /**
   * Cinematic interlude: full-screen shroud (opacity) then DISPOSE+REQUEST.
   * True dual-engine DOM crossfade (EngineSlot A/B + ENGINE.SWAP) can follow when
   * re-parenting / slot order is fully wired — see `EngineSlot` comments.
   */
  const runCinematicEngineToggle = useCallback(() => {
    if (cinematicBusyRef.current) return
    const slots = engineSlotsRef.current
    if (!slots) return
    const shroud = cinematicShroudRef.current

    const doSwap = () => {
      const id = engineRef.getSnapshot().context.engineId
      const next: 'globe' | 'graph' = id === 'graph' ? 'globe' : 'graph'
      const view = next as AtlasView
      appRef.send({ type: 'ATLAS_VIEW.SET', view })
      engineRef.send({ type: 'ENGINE.DISPOSE' })
      engineRef.send({
        type:     'ENGINE.REQUEST',
        engineId: next,
        input:    { container: slots.slotB, view },
      })
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!shroud || reduced) {
      doSwap()
      return
    }

    void (async () => {
      cinematicBusyRef.current = true
      try {
        shroud.style.pointerEvents = 'auto'
        shroud.style.opacity = '0'
        void shroud.offsetHeight
        shroud.style.opacity = '0.92'
        await new Promise((r) => { window.setTimeout(r, CINEMATIC_MS) })
        doSwap()
        shroud.style.opacity = '0'
        await new Promise((r) => { window.setTimeout(r, CINEMATIC_MS) })
      } finally {
        shroud.style.pointerEvents = 'none'
        cinematicBusyRef.current = false
      }
    })()
  }, [appRef, engineRef])

  // Dev only: Alt+G — globe ↔ graph with cinematic shroud
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.key.toLowerCase() !== 'g') return
      e.preventDefault()
      runCinematicEngineToggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runCinematicEngineToggle])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090b10', position: 'relative' }}>
      <RouterSync />
      <motion.div style={{ opacity: globeOpacity, scale: globeScale, position: 'absolute', inset: 0 }}>
        <EngineSlot actorRef={engineRef} onRefsReady={handleRefsReady} />
      </motion.div>
      <div ref={cinematicShroudRef} className={styles.engineCinematicShroud} aria-hidden />
      <CompanyOverlayHost />
      <PersonOverlayHost />
      <AnimatePresence>
        {atlasView === 'network' && (
          <motion.div
            key="graph-panel"
            style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <GraphViewPanel />
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
      <AtlasViewToggle />
    </div>
  )
}
