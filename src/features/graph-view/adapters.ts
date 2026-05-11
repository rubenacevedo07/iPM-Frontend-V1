// src/features/graph-view/adapters.ts
//
// Boundary adapters: domain types (`@/domain/types` per Rule 1) → layout-engine
// view shapes (`LayoutInput` from graphLayoutEngine). Keeps GraphViewPanel free
// of API shape knowledge — components consume already-positioned nodes/edges
// produced by `layoutEngine.calculate(...)`. Mirrors the pattern in
// `src/features/person-overlay/adapters.ts`.

import type { NeighborsResponse, NodeType } from '@/domain/types'
import { getEdgeTypeMeta } from '@/types/_ext/edgeTypes'
import { getEntityImage, toInitials } from '@/types/_ext/entityImages'
import type { LayoutInput, LayoutInputNode } from './layout/graphLayoutEngine'

type LayoutNodeType = LayoutInputNode['Type']

function nodeTypeToLayoutType(t: NodeType): LayoutNodeType {
  const v = String(t).toLowerCase()
  if (v === 'person')  return 'person'
  if (v === 'company') return 'company'
  if (v === 'country') return 'country'
  return 'company'
}

function dbIdFromNodeId(nodeId: string): string {
  const idx = nodeId.indexOf(':')
  return idx >= 0 ? nodeId.slice(idx + 1) : nodeId
}

function scoreToLabel(score: number | null | undefined): string | undefined {
  if (score == null) return undefined
  return score.toFixed(0)
}

/**
 * Normalize the value backend ships as `photoUrl`. Three accepted formats:
 *   1. Filename only        — "Musk.jpeg"           → prefixed by type
 *   2. Relative path        — "/persons/Musk.jpeg"  → as-is
 *   3. Absolute URL         — "https://cdn.../"     → as-is
 * Returns undefined for null/empty.
 */
function normalizePhotoUrl(raw: string | null | undefined, type: NodeType): string | undefined {
  if (!raw) return undefined
  const v = raw.trim()
  if (!v) return undefined
  if (v.startsWith('http://') || v.startsWith('https://')) return v
  if (v.startsWith('/')) return v
  // Filename only — pick directory by entity type.
  const t = String(type).toLowerCase()
  if (t === 'person')  return `/persons/${v}`
  if (t === 'company') return `/logos/${v}`
  return undefined  // unknown type → can't safely prefix
}

/**
 * Backend tech-debt: `/graph/node/{nodeId}/neighbors` returns a flat array of
 * GraphNodeDto-shape objects today, not the typed `NeighborsResponse` envelope.
 * Until the backend honors the contract documented in `docs/backend-graph-brief.md`,
 * we coerce the live array shape into a `NeighborsResponse` here.
 */
type LegacyNeighborNode = {
  id?:       string
  nodeId?:   string | null
  entityId?: number
  type?:     string
  label?:    string
  name?:     string | null
  photoUrl?: string | null
  score?:    number | null
}

function isLegacyArrayShape(res: unknown): res is LegacyNeighborNode[] {
  return Array.isArray(res)
}

function coerceLegacyShape(arr: LegacyNeighborNode[], centerNodeId: string): NeighborsResponse {
  const nodes: NeighborsResponse['nodes'] = arr.map(n => ({
    nodeId:         n.nodeId ?? n.id ?? '',
    name:           n.name ?? n.label ?? '',
    type:           (String(n.type ?? '').toUpperCase()) as NodeType,
    compositeScore: n.score ?? null,
    photoUrl:       n.photoUrl ?? null,
  }))
  return { centralNodeId: centerNodeId, nodes, edges: [] }
}

/**
 * Build a `LayoutInput` from a `NeighborsResponse`. The response's
 * `centralNodeId` becomes the layout center; remaining nodes form ring 1.
 *
 * @param res            backend NeighborsResponse (1-hop today)
 * @param centerFallback name to use if the central node is missing from
 *                       `res.nodes` (e.g. some endpoints omit it from the list)
 */
export function toLayoutInput(
  res: NeighborsResponse | LegacyNeighborNode[],
  centerFallback?: { name?: string; type?: NodeType; nodeId?: string },
): LayoutInput {
  // Defensive: backend still returns the legacy array shape. Coerce to envelope.
  const envelope: NeighborsResponse = isLegacyArrayShape(res)
    ? coerceLegacyShape(res, centerFallback?.nodeId ?? '')
    : res

  const centerNeighbor = envelope.nodes.find(n => n.nodeId === envelope.centralNodeId)
  const otherNodes     = envelope.nodes.filter(n => n.nodeId !== envelope.centralNodeId)

  // Cascading avatar resolution (best → fallback):
  //   1. Backend `photoUrl`         — authoritative once backend ships Ask 1
  //   2. Local lookup table          — temporary shim while backend is wired
  //   3. Initials of label/name     — final fallback (e.g. "EM")
  const resolveAvatar = (name: string, type: NodeType, photoUrl?: string | null): string =>
    normalizePhotoUrl(photoUrl, type)
      ?? getEntityImage(name, type)
      ?? toInitials(name)

  const center: LayoutInputNode = centerNeighbor
    ? {
        NodeId: centerNeighbor.nodeId,
        Label:  centerNeighbor.name,
        Type:   nodeTypeToLayoutType(centerNeighbor.type),
        DbId:   dbIdFromNodeId(centerNeighbor.nodeId),
        Score:  scoreToLabel(centerNeighbor.compositeScore),
        Accent: 'primary',
        Avatar: resolveAvatar(centerNeighbor.name, centerNeighbor.type, centerNeighbor.photoUrl),
      }
    : {
        NodeId: envelope.centralNodeId,
        Label:  centerFallback?.name ?? envelope.centralNodeId,
        Type:   nodeTypeToLayoutType((centerFallback?.type ?? 'PERSON') as NodeType),
        DbId:   dbIdFromNodeId(envelope.centralNodeId),
        Accent: 'primary',
        Avatar: centerFallback?.name
          ? resolveAvatar(centerFallback.name, centerFallback.type ?? 'PERSON', null)
          : undefined,
      }

  return {
    center,
    nodes: otherNodes.map(n => ({
      NodeId: n.nodeId,
      Label:  n.name,
      Type:   nodeTypeToLayoutType(n.type),
      DbId:   dbIdFromNodeId(n.nodeId),
      Score:  scoreToLabel(n.compositeScore),
      Avatar: resolveAvatar(n.name, n.type, n.photoUrl),
    })),
    edges: envelope.edges.map((e, i) => {
      const meta = getEdgeTypeMeta(e.edgeType)
      return {
        EdgeId:   `${e.sourceNodeId}__${e.targetNodeId}__${i}`,
        Source:   e.sourceNodeId,
        Target:   e.targetNodeId,
        EdgeType: e.edgeType,
        Strength: e.strength,
        Color:    meta.color,
        Label:    meta.label,
      }
    }),
  }
}
