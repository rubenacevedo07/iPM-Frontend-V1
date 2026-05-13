import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { z } from 'zod'
import { rootRoute } from './__root'

const workstationSearchSchema = z.object({
  overlay:    z.enum(['company', 'vs', 'gold', 'powermap', 'hq']).optional(),
  id:         z.coerce.number().int().positive().optional(),
  a:          z.coerce.number().int().positive().optional(),
  b:          z.coerce.number().int().positive().optional(),
  q:          z.string().optional(),
  powermapId: z.string().optional(),
  // Headquarters dual overlay (?overlay=hq) — both ids required.
  personId:   z.coerce.number().int().positive().optional(),
  companyId:  z.coerce.number().int().positive().optional(),
  // Relation Studio — optional pair override (nodeId strings e.g. "person:7")
  relationA:  z.string().optional(),
  relationB:  z.string().optional(),
})

export type WorkstationSearch = z.infer<typeof workstationSearchSchema>

// Day 4+ (perf): AppShell is lazy-loaded so the router chunk doesn't drag the
// engine subsystem (deck.gl + three.js + framer-motion + EngineManager) into
// the landing-page critical path. The LandingPage warms this chunk via
// `void import('@/app/AppShell')` during the intro video so by the time the
// user clicks Skip / the video ends, the chunk is parsed and the route
// transition feels instant. Cold deep-link to `/workstation` pays the
// ~190 kB download once; landing-warmed traffic pays nothing visible.
export const workstationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workstation',
  validateSearch: (search) => workstationSearchSchema.parse(search),
  component: lazyRouteComponent(() => import('@/app/AppShell'), 'AppShell'),
})
