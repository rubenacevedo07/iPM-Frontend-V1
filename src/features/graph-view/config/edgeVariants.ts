// src/features/graph-view/config/edgeVariants.ts
// Semantic edge color tokens. GlowEdge reads from this config in Phase 2+.
// Adding a new relationship type = one new entry here, zero component changes.
import type { EdgeVariant } from '@/types/graphView'

export const EDGE_VARIANTS = {
  ownership:  { stroke: '#4DA3FF', glow: 'rgba(77,163,255,0.45)'  },
  influence:  { stroke: '#8B5CF6', glow: 'rgba(139,92,246,0.45)'  },
  risk:       { stroke: '#FF6B6B', glow: 'rgba(255,107,107,0.45)' },
  inferred:   { stroke: '#64748B', glow: 'rgba(100,116,139,0.35)' },
  dependency: { stroke: '#F5A623', glow: 'rgba(245,166,35,0.40)'  },
} as const satisfies Record<EdgeVariant, { stroke: string; glow: string }>

export const DEFAULT_EDGE_STYLE = {
  stroke: '#4DA3FF',
  glow:   'rgba(77,163,255,0.35)',
}

export function resolveEdgeStyle(variant?: EdgeVariant, catalogColor?: string) {
  if (catalogColor) {
    return {
      stroke: catalogColor,
      glow:   catalogColor + '70',
    }
  }
  return variant ? EDGE_VARIANTS[variant] : DEFAULT_EDGE_STYLE
}
