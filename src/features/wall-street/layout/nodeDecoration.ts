import type { SugiyamaNodeData } from '@/types/_ext/sugiyamaGraph'
import type { WallStreetNodeData } from '@/types/wallStreetGraph'
import { POWER_VIEW_HIERARCHY, POWER_VIEW_COLOR_OVERRIDES } from '../data/powerViewSubset'

export const BORDER_COLOR: Record<string, string> = {
  institution:   '#a855f7',
  bank:          '#00e5ff',
  asset_manager: '#3b82f6',
  person:        '#ffb547',
}

export function nodeWidth(label: string): number {
  return Math.max(label.length * 8 + 32, 120)
}

export function initials(label: string): string {
  const words = label.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  return label.slice(0, 2).toUpperCase()
}

export function categoryFromId(entityId: string): string {
  return entityId.split(':')[0] ?? 'default'
}

export function typeLabel(entityId: string): string {
  return categoryFromId(entityId).replace(/_/g, ' ').toUpperCase()
}

export function buildSugiyamaNodeData(n: WallStreetNodeData): SugiyamaNodeData {
  const meta  = POWER_VIEW_HIERARCHY[n.entityId]
  const label = meta?.shortLabel ?? n.canonicalName
  const color = POWER_VIEW_COLOR_OVERRIDES[n.entityId]
                ?? BORDER_COLOR[categoryFromId(n.entityId)]
                ?? '#94a3b8'

  return {
    label,
    typeLabel:   typeLabel(n.entityId),
    initials:    initials(label),
    borderColor: color,
    nodeWidth:   nodeWidth(label),
  }
}
