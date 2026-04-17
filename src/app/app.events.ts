import type { WorkstationSearch } from '@/routes/workstation'
import type { AtlasView } from '@/types/atlas'
import type { EngineId } from '@/engine/contracts/inputs'

export type EntityRef = {
  id:     number
  nodeId: string
  type:   'PERSON' | 'COMPANY' | 'COUNTRY'
  slug:   string
  name:   string
}

export type AppEvent =
  | { type: 'URL_CHANGED';  search: WorkstationSearch }
  | { type: 'OPEN_PERSON';  id: number }
  | { type: 'OPEN_COMPANY'; id: number }
  | { type: 'OPEN_VS';      a: number; b: number }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'SEARCH_OPEN' }
  | { type: 'SEARCH_CLOSE' }
  | { type: 'SEARCH_QUERY'; q: string }
  | { type: 'FOCUS_ENTITY'; entity: EntityRef }
  | { type: 'BLUR_ENTITY' }
  // AtlasView engine events
  | { type: 'ATLAS_VIEW.SET';      view: AtlasView }
  | { type: 'ATLAS.ENTITY_CLICK';  entity: EntityRef }
  | { type: 'ATLAS.ENGINE_FAILED'; engineId: EngineId; error: Error }
