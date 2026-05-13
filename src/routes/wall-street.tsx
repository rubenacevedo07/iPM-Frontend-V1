import { lazy, Suspense } from 'react'
import { createRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { rootRoute } from './__root'

const wallStreetSearchSchema = z.object({
  view:   z.enum(['power', 'command', 'passive', 'advanced']).optional(),
  layout: z.enum(['sugiyama', 'force', 'vertical']).optional(),
})

export type WallStreetSearch = z.infer<typeof wallStreetSearchSchema>

// Day 4+ (perf): WallStreetPage is heavy (sigma + d3 + @xyflow integration).
// `React.lazy` here (rather than lazyRouteComponent) keeps the thin fullscreen
// wrapper static so the route's component reference never changes — TanStack
// Router's prefetch + match cache stay valid across navigations. Suspense
// boundary lives inline; no global fallback for `/wall-street` was previously
// defined, so `fallback={null}` preserves the current visual contract (the
// page fades in when ready).
const WallStreetPage = lazy(() =>
  import('@/features/wall-street/WallStreetPage').then(m => ({ default: m.WallStreetPage }))
)

function WallStreetRouteComponent() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Suspense fallback={null}>
        <WallStreetPage />
      </Suspense>
    </div>
  )
}

export const wallStreetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wall-street',
  validateSearch: (search) => wallStreetSearchSchema.parse(search),
  component: WallStreetRouteComponent,
})
