// src/features/graph-view/config/nodeAccents.ts
// Accent color tokens for graph nodes. Moved from orbitalLayout.ts so the
// config layer stays independent from the layout engine.
import type { GraphNodeAccent } from '@/types/graphView'

export const getTypeAccent = (accent?: GraphNodeAccent) => {
  switch (accent) {
    case 'primary':
      return { color: '#00E5FF', glow: 'rgba(0,229,255,0.22)',   bg: 'rgba(0,229,255,0.06)' }
    case 'warning':
      return { color: '#F5A623', glow: 'rgba(245,166,35,0.22)',  bg: 'rgba(245,166,35,0.06)' }
    case 'success':
      return { color: '#3ECF8E', glow: 'rgba(62,207,142,0.22)',  bg: 'rgba(62,207,142,0.06)' }
    case 'secondary':
      return { color: '#94A3B8', glow: 'rgba(148,163,184,0.16)', bg: 'rgba(148,163,184,0.04)' }
    default:
      return { color: '#E2E8F0', glow: 'rgba(226,232,240,0.16)', bg: 'rgba(226,232,240,0.04)' }
  }
}
