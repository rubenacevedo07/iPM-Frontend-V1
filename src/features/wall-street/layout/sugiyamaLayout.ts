import type { WallStreetNodeData, WallStreetRawEdge } from '@/types/wallStreetGraph'
import type { SugiyamaNodeData } from '@/types/_ext/sugiyamaGraph'
import { buildSugiyamaNodeData } from './nodeDecoration'

export interface PositionedSugiyamaNode {
  entityId: string
  x:        number
  y:        number
  nodeData: SugiyamaNodeData
}

// ─── LAYOUT CONSTANTS ──────────────────────────────────────────
const VIEWPORT_W = 1200
const NODE_W     = 160   // approximate — used only for collision nudge

// Vertical Y positions — strictly top-down, no edge ever goes upward
const Y_FED  = 40    // Federal Reserve: sovereign top
const Y_AM   = 180   // Asset managers: ownership layer
const Y_BANK = 340   // Banks: regulated intermediaries
const Y_CEO  = 500   // CEOs: operational layer

// ─── LAYOUT FUNCTION ───────────────────────────────────────────
// Cluster Columns: each bank is a vertical column [AM above → bank → CEO below],
// Federal Reserve floats at the top as super-controller. All edges flow strictly
// top-down, compatible with the fixed handles (src-bottom → tgt-top).
export function computeSugiyamaLayout(
  nodes: WallStreetNodeData[],
  edges: WallStreetRawEdge[] = [],
): PositionedSugiyamaNode[] {
  const positions: Record<string, { x: number; y: number }> = {}

  // 1. Separate nodes by type
  const institutions = nodes.filter(n => n.entityType === 'institution')
  const banks        = nodes.filter(n => n.entityType === 'bank')
  const managers     = nodes.filter(n => n.entityType === 'asset_manager')
  const persons      = nodes.filter(n => n.entityType === 'person')

  // 2. Sort banks by governance centrality (more regulated → left)
  const GOV_TYPES = new Set(['Governs', 'Regulates', 'Monitors', 'Sets'])
  const OWN_TYPES = new Set(['Owns', 'Custodies', 'Finances', 'Influences'])
  const CEO_TYPE  = 'CeoOf'

  const bankGovScore = (bank: WallStreetNodeData): number =>
    edges.filter(e => e.target === bank.entityId && GOV_TYPES.has(e.data.edgeType)).length

  const sortedBanks = [...banks].sort((a, b) => bankGovScore(b) - bankGovScore(a))

  // 3. Bank column X positions — evenly distributed with side padding
  const colPad  = 100
  const usableW = VIEWPORT_W - colPad * 2
  const colStep = sortedBanks.length > 1 ? usableW / (sortedBanks.length - 1) : 0

  const bankColumnX: Record<string, number> = {}
  sortedBanks.forEach((bank, i) => {
    bankColumnX[bank.entityId] = colPad + i * colStep
  })

  // 4. Place banks
  sortedBanks.forEach(bank => {
    positions[bank.entityId] = { x: bankColumnX[bank.entityId], y: Y_BANK }
  })

  // 5. Place CEOs directly below their bank (CeoOf edge: person → bank)
  persons.forEach(person => {
    const ceoEdge = edges.find(
      e => e.source === person.entityId && e.data.edgeType === CEO_TYPE,
    )
    if (ceoEdge && bankColumnX[ceoEdge.target] !== undefined) {
      positions[person.entityId] = { x: bankColumnX[ceoEdge.target], y: Y_CEO }
    } else {
      // Powell or person not linked via CeoOf — place below Fed center
      positions[person.entityId] = { x: VIEWPORT_W / 2, y: Y_CEO }
    }
  })

  // 6. Place asset managers — x = weighted avg of banks they own/influence
  managers.forEach((am, fallbackIdx) => {
    const ownedBankXs = edges
      .filter(e => e.source === am.entityId && OWN_TYPES.has(e.data.edgeType))
      .map(e => bankColumnX[e.target])
      .filter((x): x is number => x !== undefined)

    const x = ownedBankXs.length > 0
      ? ownedBankXs.reduce((sum, v) => sum + v, 0) / ownedBankXs.length
      : colPad + fallbackIdx * (usableW / Math.max(managers.length - 1, 1))

    positions[am.entityId] = { x, y: Y_AM }
  })

  // 7. Federal Reserve at top center
  institutions.forEach(inst => {
    positions[inst.entityId] = { x: VIEWPORT_W / 2, y: Y_FED }
  })

  // 8. Collision nudge for asset managers
  const amIds = managers.map(m => m.entityId)
  for (let i = 0; i < amIds.length; i++) {
    for (let j = i + 1; j < amIds.length; j++) {
      const a = positions[amIds[i]]
      const b = positions[amIds[j]]
      if (!a || !b) continue
      const dx = Math.abs(b.x - a.x)
      if (dx < NODE_W + 20) {
        const push = (NODE_W + 20 - dx) / 2
        if (a.x <= b.x) { a.x -= push; b.x += push }
        else            { a.x += push; b.x -= push }
        a.x = Math.max(colPad / 2, Math.min(VIEWPORT_W - colPad / 2, a.x))
        b.x = Math.max(colPad / 2, Math.min(VIEWPORT_W - colPad / 2, b.x))
      }
    }
  }

  return nodes.map(n => {
    const p = positions[n.entityId] ?? { x: 0, y: 0 }
    return {
      entityId: n.entityId,
      x:        p.x,
      y:        p.y,
      nodeData: buildSugiyamaNodeData(n),
    }
  })
}
