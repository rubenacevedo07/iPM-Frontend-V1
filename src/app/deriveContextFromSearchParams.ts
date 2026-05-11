import type { WorkstationSearch } from '@/routes/workstation'

export type NavigationContext = {
  overlayType: 'person' | 'company' | 'vs' | 'gold' | 'powermap' | null
  overlayId:   number | null
  overlayIdB:  number | null
  powermapId:  string | null
  searchQuery: string
}

export function deriveContextFromSearchParams(s: WorkstationSearch): NavigationContext {
  return {
    overlayType: s.overlay ?? null,
    overlayId:   s.id ?? s.a ?? null,
    overlayIdB:  s.b ?? null,
    powermapId:  s.powermapId ?? null,
    searchQuery: s.q ?? '',
  }
}
