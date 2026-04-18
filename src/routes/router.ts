import { createRouter } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { indexRoute } from './index'
import { workstationRoute } from './workstation'
import { companyViewRoute } from './company-view'

const routeTree = rootRoute.addChildren([indexRoute, workstationRoute, companyViewRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
