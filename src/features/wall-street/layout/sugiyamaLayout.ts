import type { WallStreetNodeData } from '@/types/wallStreetGraph'
import type { SugiyamaNodeData } from '@/types/_ext/sugiyamaGraph'
import {
  POWER_VIEW_HIERARCHY,
  POWER_VIEW_COLOR_OVERRIDES,
} from '../data/powerViewSubset'

export interface PositionedSugiyamaNode {
  entityId: string
  x:        number
  y:        number
  nodeData: SugiyamaNodeData
}

const BORDER_COLOR: Record<string, string> = {
  institution:   '#a855f7',
  bank:          '#00e5ff',
  asset_manager: '#3b82f6',
  person:        '#ffb547',
}

// Fixed x positions for each node in the power view subset.
// L1 y=0, L2 y=180, L3 y=360.
const FIXED_X: Record<string, number> = {
  'institution:federal-reserve-system': 354,
  'bank:jpmorgan-chase':                 75,
  'bank:goldman-sachs':                 212,
  'bank:morgan-stanley':                341,
  'asset_manager:blackrock':            525,
  'asset_manager:vanguard':             655,
  'person:jerome-powell':               362,
  'person:jamie-dimon':                  87,
  'person:david-solomon':               212,
  'person:larry-fink':                  525,
}

const FIXED_Y: Record<string, number> = {
  'institution:federal-reserve-system': 0,
  'bank:jpmorgan-chase':               180,
  'bank:goldman-sachs':                180,
  'bank:morgan-stanley':               180,
  'asset_manager:blackrock':           180,
  'asset_manager:vanguard':            180,
  'person:jerome-powell':              360,
  'person:jamie-dimon':                360,
  'person:david-solomon':              360,
  'person:larry-fink':                 360,
}

function nodeWidth(label: string): number {
  return Math.max(label.length * 8 + 32, 120)
}

function initials(label: string): string {
  const words = label.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  return label.slice(0, 2).toUpperCase()
}

function categoryFromId(entityId: string): string {
  return entityId.split(':')[0] ?? 'default'
}

function typeLabel(entityId: string): string {
  const cat = categoryFromId(entityId)
  return cat.replace(/_/g, ' ').toUpperCase()
}

export function computeSugiyamaLayout(nodes: WallStreetNodeData[]): PositionedSugiyamaNode[] {
  return nodes.map(n => {
    const meta  = POWER_VIEW_HIERARCHY[n.entityId]
    const label = meta?.shortLabel ?? n.canonicalName
    const w     = nodeWidth(label)
    const color = POWER_VIEW_COLOR_OVERRIDES[n.entityId]
                  ?? BORDER_COLOR[categoryFromId(n.entityId)]
                  ?? '#94a3b8'

    return {
      entityId: n.entityId,
      x:        FIXED_X[n.entityId] ?? 0,
      y:        FIXED_Y[n.entityId] ?? 0,
      nodeData: {
        label,
        typeLabel:   typeLabel(n.entityId),
        initials:    initials(label),
        borderColor: color,
        nodeWidth:   w,
      },
    }
  })
}
