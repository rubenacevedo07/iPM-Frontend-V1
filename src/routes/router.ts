import { createRouter } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { indexRoute } from './index'
import { workstationRoute } from './workstation'

const routeTree = rootRoute.addChildren([indexRoute, workstationRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
