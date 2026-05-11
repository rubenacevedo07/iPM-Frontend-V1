import { createRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { rootRoute } from './__root'
import { AppShell } from '@/app/AppShell'

const workstationSearchSchema = z.object({
  overlay: z.enum(['person', 'company', 'vs', 'gold']).optional(),
  id: z.coerce.number().int().positive().optional(),
  a:  z.coerce.number().int().positive().optional(),
  b:  z.coerce.number().int().positive().optional(),
  q:  z.string().optional(),
})

export type WorkstationSearch = z.infer<typeof workstationSearchSchema>

export const workstationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workstation',
  validateSearch: (search) => workstationSearchSchema.parse(search),
  component: AppShell,
})
