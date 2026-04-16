import { fromCallback } from 'xstate'
import type { WorkstationSearch } from '@/routes/workstation'

export type NavEvent = { type: 'NAVIGATE'; search: WorkstationSearch }

export const navigationActor = fromCallback<NavEvent>(() => {
  // Stub — real implementation in sub-tarea D
})
