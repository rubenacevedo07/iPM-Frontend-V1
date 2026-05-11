import type { SubsetNodeMeta, ZoneSpec } from './powerViewSubset'

const SOVEREIGN = '#94a3b8'
const POLICY    = '#00d4aa'
const REGULATOR = '#ffb547'
const BANK      = '#00e5ff'
const PERSON    = '#a855f7'

export const COMMAND_CHAIN_NODE_IDS = [
  'country:us',
  'institution:us-treasury',
  'institution:federal-reserve-system',
  'institution:nyfed',
  'institution:sec',
  'bank:jpmorgan-chase',
  'bank:goldman-sachs',
  'bank:citigroup',
  'person:scott-bessent',
  'person:jerome-powell',
  'person:kevin-warsh',
  'person:jamie-dimon',
  'person:david-solomon',
  'person:jane-fraser',
] as const

export const COMMAND_CHAIN_HIERARCHY: Record<string, SubsetNodeMeta> = {
  'country:us':                          { hierarchyLevel: 0, columnIndex: 0, columnsInLevel: 1, nodeSize: 'xl', shortLabel: 'United States' },

  'institution:us-treasury':             { hierarchyLevel: 1, columnIndex: 0, columnsInLevel: 2, nodeSize: 'lg', shortLabel: 'US Treasury' },
  'person:scott-bessent':                { hierarchyLevel: 1, columnIndex: 1, columnsInLevel: 2, nodeSize: 'sm', shortLabel: 'Scott Bessent' },

  'institution:federal-reserve-system':  { hierarchyLevel: 2, columnIndex: 1, columnsInLevel: 3, nodeSize: 'lg', shortLabel: 'Federal Reserve' },
  'person:jerome-powell':                { hierarchyLevel: 2, columnIndex: 0, columnsInLevel: 3, nodeSize: 'sm', shortLabel: 'Powell (current)' },
  'person:kevin-warsh':                  { hierarchyLevel: 2, columnIndex: 2, columnsInLevel: 3, nodeSize: 'sm', shortLabel: 'Warsh (May 15)' },

  'institution:nyfed':                   { hierarchyLevel: 3, columnIndex: 0, columnsInLevel: 2, nodeSize: 'md', shortLabel: 'NY Fed' },
  'institution:sec':                     { hierarchyLevel: 3, columnIndex: 1, columnsInLevel: 2, nodeSize: 'md', shortLabel: 'SEC' },

  'bank:jpmorgan-chase':                 { hierarchyLevel: 4, columnIndex: 0, columnsInLevel: 3, nodeSize: 'lg', shortLabel: 'JPMorgan Chase' },
  'bank:goldman-sachs':                  { hierarchyLevel: 4, columnIndex: 1, columnsInLevel: 3, nodeSize: 'lg', shortLabel: 'Goldman Sachs' },
  'bank:citigroup':                      { hierarchyLevel: 4, columnIndex: 2, columnsInLevel: 3, nodeSize: 'lg', shortLabel: 'Citigroup' },

  'person:jamie-dimon':                  { hierarchyLevel: 5, columnIndex: 0, columnsInLevel: 3, nodeSize: 'md', shortLabel: 'Jamie Dimon' },
  'person:david-solomon':                { hierarchyLevel: 5, columnIndex: 1, columnsInLevel: 3, nodeSize: 'md', shortLabel: 'David Solomon' },
  'person:jane-fraser':                  { hierarchyLevel: 5, columnIndex: 2, columnsInLevel: 3, nodeSize: 'md', shortLabel: 'Jane Fraser' },
}

export const COMMAND_CHAIN_ZONES: ZoneSpec[] = [
  { startLevel: 0, endLevel: 0, label: 'SOVEREIGN',                    color: SOVEREIGN },
  { startLevel: 1, endLevel: 2, label: 'POLITICAL & MONETARY POLICY',  color: POLICY },
  { startLevel: 3, endLevel: 3, label: 'REGULATORS',                   color: REGULATOR },
  { startLevel: 4, endLevel: 4, label: 'REGULATED BANKS',              color: BANK },
  { startLevel: 5, endLevel: 5, label: 'BANK LEADERS',                 color: PERSON },
]

export const COMMAND_CHAIN_COLOR_OVERRIDES: Record<string, string> = {
  'country:us':                         SOVEREIGN,
  'institution:us-treasury':            POLICY,
  'person:scott-bessent':               POLICY,
  'institution:federal-reserve-system': POLICY,
  'person:jerome-powell':               POLICY,
  'person:kevin-warsh':                 POLICY,
  'institution:nyfed':                  REGULATOR,
  'institution:sec':                    REGULATOR,
  'bank:jpmorgan-chase':                BANK,
  'bank:goldman-sachs':                 BANK,
  'bank:citigroup':                     BANK,
  'person:jamie-dimon':                 PERSON,
  'person:david-solomon':               PERSON,
  'person:jane-fraser':                 PERSON,
}

// Edges to drop (per spec: skip Fed→SEC peer line, skip Fed→country:us "Sets" since
// it inverts the chain-of-command direction the view is teaching).
export const COMMAND_CHAIN_DROP_EDGES = (e: { source: string; target: string }): boolean => {
  if (e.source === 'institution:federal-reserve-system' && e.target === 'country:us') return true
  return false
}
