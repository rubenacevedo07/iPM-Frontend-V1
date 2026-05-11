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

// Sugiyama layer positions:
//   L1 y=0:   central institutions
//   L2 y=180: banks sublane x=80..480 | asset managers sublane x=520..780
//   L3 y=360: persons x-aligned below their primary institution
//
// Banks (5): step = (480-80)/4 = 100 → 80, 180, 280, 380, 480
// Asset mgrs (3): step = (780-520)/2 = 130 → 520, 650, 780
// Fed Reserve centered above banks midpoint: (80+480)/2 - nodeWidth/2 ≈ 280 - 60 = 222
// Persons aligned under: Powell→Fed(280), Dimon→JPM(80), Solomon→GS(180), Pick→MS(280→360 offset), Fink→BR(520)

const FIXED_X: Record<string, number> = {
  // L1 — institution centered at x=222 (Fed width≈152, center=298 ≈ midpoint of 80..480 minus half)
  'institution:federal-reserve-system': 222,

  // L2 banks sublane x=80..480
  'bank:jpmorgan-chase':                 80,
  'bank:goldman-sachs':                 180,
  'bank:morgan-stanley':                280,
  'bank:bank-of-america':               380,
  'bank:citigroup':                     480,

  // L2 asset managers sublane x=520..780
  'asset_manager:blackrock':            520,
  'asset_manager:vanguard':            650,
  'asset_manager:state-street':         760,

  // L3 persons aligned under primary institution
  'person:jerome-powell':               222,
  'person:jamie-dimon':                  80,
  'person:david-solomon':               180,
  'person:ted-pick':                    280,
  'person:larry-fink':                  520,
}

const FIXED_Y: Record<string, number> = {
  'institution:federal-reserve-system': 0,
  'bank:jpmorgan-chase':               180,
  'bank:goldman-sachs':                180,
  'bank:morgan-stanley':               180,
  'bank:bank-of-america':              180,
  'bank:citigroup':                    180,
  'asset_manager:blackrock':           180,
  'asset_manager:vanguard':            180,
  'asset_manager:state-street':        180,
  'person:jerome-powell':              360,
  'person:jamie-dimon':                360,
  'person:david-solomon':              360,
  'person:ted-pick':                   360,
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
