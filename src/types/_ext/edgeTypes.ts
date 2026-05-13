// src/types/_ext/edgeTypes.ts
//
// Catalog of the 16 EdgeType values the backend exposes (PgEnums.EdgeType).
// Source of truth: docs/backend-graph-brief.md (response from backend agent).
// Justified under Rule 1: this metadata is new info not present in v3 — it's
// the UI layer's view of a backend enum (label, color, group) for legend &
// filter UIs. The underlying string value mirrors the backend enum verbatim.

export const EDGE_TYPE_VALUES = [
  'Supplies',
  'Manufactures',
  'Distributes',
  'DependsOn',
  'Finances',
  'Owns',
  'Regulates',
  'Sanctions',
  'Influences',
  'Governs',
  'Competes',
  'Partners',
  'Exports',
  'MilitaryConflict',
  'Sets',
  'Custom',
] as const

export type EdgeTypeKey = typeof EDGE_TYPE_VALUES[number]

export type EdgeTypeGroup = 'flow' | 'control' | 'relation' | 'tension' | 'misc'

export interface EdgeTypeMeta {
  label: string
  color: string
  group: EdgeTypeGroup
}

export const EDGE_TYPE_META: Record<EdgeTypeKey, EdgeTypeMeta> = {
  Supplies:         { label: 'Supplies',          color: '#00D4AA', group: 'flow'     },
  Manufactures:     { label: 'Manufactures',      color: '#00E5FF', group: 'flow'     },
  Distributes:      { label: 'Distributes',       color: '#4DA3FF', group: 'flow'     },
  Exports:          { label: 'Exports',           color: '#26C6DA', group: 'flow'     },

  Owns:             { label: 'Owns',              color: '#9D6BFF', group: 'control'  },
  Finances:         { label: 'Finances',          color: '#7B61FF', group: 'control'  },
  Regulates:        { label: 'Regulates',         color: '#5A8FFF', group: 'control'  },
  Governs:          { label: 'Governs',           color: '#3D5BFF', group: 'control'  },

  Influences:       { label: 'Influences',        color: '#00B7D6', group: 'relation' },
  Partners:         { label: 'Partners',          color: '#00D4AA', group: 'relation' },

  DependsOn:        { label: 'Depends on',        color: '#F5A623', group: 'tension'  },
  Sanctions:        { label: 'Sanctions',         color: '#E53935', group: 'tension'  },
  Competes:         { label: 'Competes',          color: '#FF6B6B', group: 'tension'  },
  MilitaryConflict: { label: 'Military Conflict', color: '#D32F2F', group: 'tension'  },

  Sets:             { label: 'Sets',              color: '#9E9E9E', group: 'misc'     },
  Custom:           { label: 'Custom',            color: '#6B7A90', group: 'misc'     },
}

export function getEdgeTypeMeta(type?: string | null): EdgeTypeMeta {
  if (!type) return EDGE_TYPE_META.Custom
  return EDGE_TYPE_META[type as EdgeTypeKey] ?? EDGE_TYPE_META.Custom
}
