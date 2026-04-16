export type EntityType = 'person' | 'company' | 'country' | 'commodity'

export interface Entity {
  id: number
  nodeId: string        // "person:7", "company:42"
  type: EntityType
  name: string
  lastName?: string
  title?: string
  countryCode?: string
}

export type CanvasMode     = 'map' | '3d' | 'charts' | 'intel' | 'timelines'
export type CenterView     = 'map' | 'supply' | 'relations' | 'infra' | 'events' | 'powermaps'
export type VsView         = 'map' | 'allies' | 'trades' | 'military' | 'events' | 'compare' | 'powermaps'
export type PccTab         = 'providers' | 'clients' | 'commodities'
export type CommodityPanel = 'prices' | 'countries' | 'chokepoints' | 'risk' | 'flow' | null
export type OverlayMode    = 'person' | 'company' | 'country' | 'vs' | 'commodities' | null
