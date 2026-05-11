import { fromCallback } from 'xstate'
import { router } from '@/routes/router'
import type { WorkstationSearch } from '@/routes/workstation'
import type { WallStreetSearch } from '@/routes/wall-street'

export type NavEvent =
  | { type: 'NAVIGATE';             search: WorkstationSearch }
  | { type: 'NAVIGATE_WALL_STREET'; search?: WallStreetSearch }

export const navigationActor = fromCallback<NavEvent>(({ receive }) => {
  receive((event) => {
    if (event.type === 'NAVIGATE') {
      router.navigate({
        to: '/workstation',
        search: event.search,
        replace: true,
      })
    } else if (event.type === 'NAVIGATE_WALL_STREET') {
      router.navigate({
        to: '/wall-street',
        search: event.search ?? {},
      })
    }
  })
})
