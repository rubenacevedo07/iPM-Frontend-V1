import type { WallStreetNodeSize } from '../components/WallStreetEntityNode'

export interface SubsetNodeMeta {
  hierarchyLevel: number
  columnIndex: number
  columnsInLevel: number
  nodeSize: WallStreetNodeSize
  shortLabel?: string
}

export interface ZoneSpec {
  startLevel: number
  endLevel: number
  label: string
  color: string
}

const FED  = '#00d4aa'
const BANK = '#00e5ff'
const ASSET = '#a855f7'
const PERSON = '#ffb547'

export const POWER_VIEW_NODE_IDS = [
  'institution:federal-reserve-system',
  'bank:jpmorgan-chase',
  'bank:goldman-sachs',
  'bank:morgan-stanley',
  'asset_manager:blackrock',
  'asset_manager:vanguard',
  'person:jerome-powell',
  'person:jamie-dimon',
  'person:david-solomon',
  'person:larry-fink',
] as const

export const POWER_VIEW_HIERARCHY: Record<string, SubsetNodeMeta> = {
  'institution:federal-reserve-system': { hierarchyLevel: 0, columnIndex: 0, columnsInLevel: 1, nodeSize: 'xl', shortLabel: 'Federal Reserve' },

  'bank:jpmorgan-chase':       { hierarchyLevel: 1, columnIndex: 0, columnsInLevel: 5, nodeSize: 'lg', shortLabel: 'JPMorgan Chase' },
  'bank:goldman-sachs':        { hierarchyLevel: 1, columnIndex: 1, columnsInLevel: 5, nodeSize: 'lg', shortLabel: 'Goldman Sachs' },
  'bank:morgan-stanley':       { hierarchyLevel: 1, columnIndex: 2, columnsInLevel: 5, nodeSize: 'lg', shortLabel: 'Morgan Stanley' },
  'asset_manager:blackrock':   { hierarchyLevel: 1, columnIndex: 3, columnsInLevel: 5, nodeSize: 'lg', shortLabel: 'BlackRock' },
  'asset_manager:vanguard':    { hierarchyLevel: 1, columnIndex: 4, columnsInLevel: 5, nodeSize: 'lg', shortLabel: 'Vanguard' },

  'person:jerome-powell':      { hierarchyLevel: 2, columnIndex: 0, columnsInLevel: 4, nodeSize: 'md', shortLabel: 'Jerome Powell' },
  'person:jamie-dimon':        { hierarchyLevel: 2, columnIndex: 1, columnsInLevel: 4, nodeSize: 'md', shortLabel: 'Jamie Dimon' },
  'person:david-solomon':      { hierarchyLevel: 2, columnIndex: 2, columnsInLevel: 4, nodeSize: 'md', shortLabel: 'David Solomon' },
  'person:larry-fink':         { hierarchyLevel: 2, columnIndex: 3, columnsInLevel: 4, nodeSize: 'md', shortLabel: 'Larry Fink' },
}

export const POWER_VIEW_ZONES: ZoneSpec[] = [
  { startLevel: 0, endLevel: 0, label: 'REGULATORY POWER', color: FED },
  { startLevel: 1, endLevel: 1, label: 'INSTITUTIONS',     color: BANK },
  { startLevel: 2, endLevel: 2, label: 'PEOPLE',           color: PERSON },
]

// Visual cluster overrides — give each tier a distinct color even though the
// JSON's primary cluster colors are the source of truth elsewhere.
export const POWER_VIEW_COLOR_OVERRIDES: Record<string, string> = {
  'institution:federal-reserve-system': FED,
  'bank:jpmorgan-chase':                BANK,
  'bank:goldman-sachs':                 BANK,
  'bank:morgan-stanley':                BANK,
  'asset_manager:blackrock':            ASSET,
  'asset_manager:vanguard':             ASSET,
  'person:jerome-powell':               PERSON,
  'person:jamie-dimon':                 PERSON,
  'person:david-solomon':               PERSON,
  'person:larry-fink':                  PERSON,
}
