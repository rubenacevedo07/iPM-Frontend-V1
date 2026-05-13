import { useEffect } from 'react'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { rootRoute } from './__root'

function LandingPage() {
  const navigate = useNavigate()
  const goToApp = () => void navigate({ to: '/workstation' })

  // Warm up workstation deps while the video plays:
  //   1. Kick off /api/Companies so HTTP cache (or in-flight Promise) is ready
  //      when useCompanies() mounts in AppShell.
  //   2. Trigger dynamic import() for every lazy chunk so the JS is parsed
  //      and sitting in module cache by the time the user activates
  //      network view / opens an overlay.
  //
  // Day 4+ (perf): `@/app/AppShell` is now itself lazy (workstationRoute uses
  // lazyRouteComponent). Warm it FIRST in the list — it's the largest chunk
  // (~190 kB gz with deck.gl + three.js + EngineManager + framer-motion) and
  // the one on the critical path of the very next user action (Skip / video
  // end → /workstation). Without this prefetch the user would stare at a
  // blank Suspense fallback for the full chunk download time.
  //
  // GeoJSON is already covered by <link rel="preload"> in index.html.
  useEffect(() => {
    void fetch('/api/Companies').catch(() => {})
    void import('@/app/AppShell')
    void import('@/features/graph-view/GraphViewPanel')
    void import('@/features/wall-street/WallStreetPage')
    void import('@/app/CompanyOverlayHost')
    void import('@/app/GoldOverlayHost')
    void import('@/features/gold-overlay/PowerMapsPanel')
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 0,
        cursor: 'pointer',
      }}
      onClick={goToApp}
    >
      <video
        src="public/videos/iPM_1.mp4"
        autoPlay
        muted
        playsInline
        onEnded={goToApp}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); goToApp() }}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          padding: '8px 18px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'rgba(255, 255, 255, 0.9)',
          fontFamily: 'inherit',
          fontSize: 12,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          cursor: 'pointer',
          borderRadius: 2,
          backdropFilter: 'blur(8px)',
        }}
      >
        Skip
      </button>
    </div>
  )
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})
