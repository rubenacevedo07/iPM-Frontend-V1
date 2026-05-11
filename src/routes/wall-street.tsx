import { createRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { rootRoute } from './__root'
import { WallStreetPage } from '@/features/wall-street/WallStreetPage'

const wallStreetSearchSchema = z.object({
  view: z.enum(['power', 'command', 'passive', 'advanced']).optional(),
})

export type WallStreetSearch = z.infer<typeof wallStreetSearchSchema>

function WallStreetRouteComponent() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <WallStreetPage />
    </div>
  )
}

export const wallStreetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wall-street',
  validateSearch: (search) => wallStreetSearchSchema.parse(search),
  component: WallStreetRouteComponent,
})
