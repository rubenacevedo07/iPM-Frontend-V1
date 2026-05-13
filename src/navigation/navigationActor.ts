import { fromCallback } from 'xstate'
import { router } from '@/routes/router'
import type { WorkstationSearch } from '@/routes/workstation'

export type NavEvent = { type: 'NAVIGATE'; search: WorkstationSearch }

export const navigationActor = fromCallback<NavEvent>(({ receive }) => {
  receive((event) => {
    if (event.type !== 'NAVIGATE') return
    router.navigate({
      to: '/workstation',
      search: event.search,
      replace: true,
    })
  })
})
