import type { ComponentType } from 'react'

export interface PowerMapEntity {
  id: string
  name: string
  type: 'financial' | 'political' | 'tech'
  coords: [number, number] // [longitude, latitude]
}

export interface PowerMapEdge {
  from: [number, number]
  to: [number, number]
  hostile?: boolean
  strength?: number
}

export type HormuzTier = 'iran' | 'us' | 'contested' | 'neutral'

export const HORMUZ_COUNTRY_TIERS: Record<string, HormuzTier> = {
  'Iran': 'iran',
  'Saudi Arabia': 'us',
  'United Arab Emirates': 'us',
  'Kuwait': 'us',
  'Bahrain': 'us',
  'Qatar': 'contested',
  'Iraq': 'contested',
  'Oman': 'neutral',
}

export const HORMUZ_TIER_TINTS: Record<HormuzTier, {
  fill: [number,number,number,number]
  stroke: [number,number,number,number]
}> = {
  iran:      { fill: [229, 57,  53,  40],  stroke: [229, 57,  53,  130] },
  us:        { fill: [59,  139, 212, 28],  stroke: [59,  139, 212, 100] },
  contested: { fill: [212, 168, 71,  28],  stroke: [212, 168, 71,  100] },
  neutral:   { fill: [255, 255, 255, 14],  stroke: [255, 255, 255, 50]  },
}

export const POWERMAP_TYPE_COLOR: Record<'financial' | 'political' | 'tech', [number,number,number]> = {
  financial: [0,   229, 255],
  political: [212, 168, 71],
  tech:      [139, 92,  246],
}

export interface PowerMapConfig {
  accentRgb: [number,number,number]
  flyTo?: { longitude: number; latitude: number; zoom: number }
  countryTierMode?: 'hormuz'
  highlightCountries?: string[]
  countryFill?: [number,number,number,number]
  countryStroke?: [number,number,number,number]
  entities?: PowerMapEntity[]
  edges?: PowerMapEdge[]

  // Optional component to mount inside the workstation network panel when
  // atlasView === 'network' AND this powermap is active. If omitted, the
  // network view falls back to the default <PowerMapOverlay> didactic panel.
  // Lazy loader so the component's chunk only ships when needed.
  networkComponent?: () => Promise<{ default: ComponentType }>
}

const HORMUZ_ENTITIES: PowerMapEntity[] = [
  { id: 'tehran',      name: 'Iran',              type: 'political', coords: [51.4,  35.7]  },
  { id: 'fifth-fleet', name: 'US 5th Fleet',      type: 'political', coords: [50.58, 26.22] },
  { id: 'irgc',        name: 'IRGC Bandar Abbas', type: 'political', coords: [56.27, 27.18] },
  { id: 'riyadh',      name: 'Saudi Arabia',      type: 'political', coords: [46.7,  24.7]  },
  { id: 'uae',         name: 'UAE',               type: 'political', coords: [54.4,  24.5]  },
  { id: 'chokepoint',  name: 'Strait of Hormuz',  type: 'political', coords: [56.25, 26.55] },
]

const HORMUZ_EDGES: PowerMapEdge[] = [
  { from: [51.4,  35.7],  to: [56.27, 27.18], strength: 0.95 },
  { from: [56.27, 27.18], to: [56.25, 26.55], strength: 0.90 },
  { from: [50.58, 26.22], to: [56.25, 26.55], strength: 0.88 },
  { from: [50.58, 26.22], to: [46.7,  24.7],  strength: 0.82 },
  { from: [50.58, 26.22], to: [54.4,  24.5],  strength: 0.78 },
  { from: [54.4,  24.5],  to: [46.7,  24.7],  strength: 0.85 },
  { from: [51.4,  35.7],  to: [46.7,  24.7],  strength: 0.40, hostile: true },
  { from: [51.4,  35.7],  to: [50.58, 26.22], strength: 0.30, hostile: true },
]

// Keys must match SearchTheme.id exactly
export const POWER_MAP_CONFIGS: Record<string, PowerMapConfig> = {
  'wall-street': {
    accentRgb: [0, 229, 255],
    flyTo: { longitude: -74, latitude: 38.5, zoom: 1.8 },
    highlightCountries: ['United States of America'],
    countryFill:   [0, 229, 255, 30],
    countryStroke: [0, 229, 255, 110],
    networkComponent: () =>
      import('@/features/wall-street/WallStreetPage').then(m => ({ default: m.WallStreetPage })),
  },
  'city-of-london': {
    accentRgb: [52, 211, 153],
    flyTo: { longitude: -0.1, latitude: 51.5, zoom: 2.5 },
    highlightCountries: ['United Kingdom'],
    countryFill:   [52, 211, 153, 28],
    countryStroke: [52, 211, 153, 100],
  },
  'german-industries': {
    accentRgb: [56, 189, 248],
    flyTo: { longitude: 10, latitude: 51, zoom: 2.8 },
    highlightCountries: ['Germany'],
    countryFill:   [56, 189, 248, 28],
    countryStroke: [56, 189, 248, 100],
  },
  'ai-power-map': {
    accentRgb: [139, 92, 246],
  },
  'blackrock-power-map': {
    accentRgb: [212, 168, 71],
  },
  'iran-usa-war': {
    accentRgb: [229, 57, 53],
    flyTo: { longitude: 54, latitude: 26.55, zoom: 2.5 },
    countryTierMode: 'hormuz',
    entities: HORMUZ_ENTITIES,
    edges: HORMUZ_EDGES,
  },
  'strait-of-hormuz': {
    accentRgb: [229, 57, 53],
    flyTo: { longitude: 54, latitude: 26.55, zoom: 3.8 },
    countryTierMode: 'hormuz',
    entities: HORMUZ_ENTITIES,
    edges: HORMUZ_EDGES,
  },
}
