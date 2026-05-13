import { createRouter } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { indexRoute } from './index'
import { workstationRoute } from './workstation'
import { wallStreetRoute } from './wall-street'

const routeTree = rootRoute.addChildren([indexRoute, workstationRoute, wallStreetRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
