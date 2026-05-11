import type { WorkstationSearch } from '@/routes/workstation'
import type { AtlasView } from '@/types/atlas'
import type { EngineId, EngineArc } from '@/engine/contracts/inputs'

export type EntityRef = {
  id:     number
  nodeId: string
  type:   'PERSON' | 'COMPANY' | 'COUNTRY'
  slug:   string
  name:   string
  isGold?: boolean
}

export type AppEvent =
  | { type: 'URL_CHANGED';  search: WorkstationSearch }
  | { type: 'OPEN_PERSON';  id: number }
  | { type: 'OPEN_COMPANY'; id: number }
  | { type: 'OPEN_VS';      a: number; b: number }
  | { type: 'OPEN_POWERMAP'; id: string }
  | { type: 'CLOSE_OVERLAY' }
  // Phase 6: v3 canonical PersonOverlay dispatches ENTITY.CLOSE to appRef.
  // Kept as alias for CLOSE_OVERLAY so canonical remains untouched (Rule 6).
  | { type: 'ENTITY.CLOSE' }
  | { type: 'SEARCH_OPEN' }
  | { type: 'SEARCH_CLOSE' }
  | { type: 'SEARCH_QUERY'; q: string }
  | { type: 'FOCUS_ENTITY'; entity: EntityRef }
  | { type: 'BLUR_ENTITY' }
  // AtlasView engine events
  | { type: 'ATLAS_VIEW.SET';      view: AtlasView }
  | { type: 'ATLAS.ENTITY_CLICK';  entity: EntityRef }
  | { type: 'ATLAS.ENGINE_FAILED'; engineId: EngineId; error: Error }
  // Phase 8: CompanyOverlayHost emits NETWORK_RESOLVED when provider/client
  // hooks settle. app.machine validates the companyId against the open overlay
  // (stale-id guard) and forwards CMD.SET_ARCS to the active bridge.
  | { type: 'NETWORK_RESOLVED';        companyId: number; arcs: EngineArc[] }
  | { type: 'PERSON_NETWORK_RESOLVED'; personId:  number; arcs: EngineArc[] }
