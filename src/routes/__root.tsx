import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppProviders } from '@/app/AppProviders'

export const rootRoute = createRootRoute({
  component: () => <AppProviders><Outlet /></AppProviders>,
})
