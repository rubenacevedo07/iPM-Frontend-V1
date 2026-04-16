// src/pages/usePersonData.ts
//
// Changes from previous version:
//   - usePersonNode now calls personService.getById() in parallel with the
//     graph-node fetch and merges all 10 PersonDetailDto fields into PersonNode.
//   - PersonNode type extended with the new fields.
//   - Everything else (usePersonDegree, usePersonNeighbors, etc.) is unchanged.

import { useState, useEffect } from 'react';
import { personService }       from '../services/personService';   // already exists
import { API_GRAPH }           from '../config/apiConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonNode {
  // existing graph-node fields
  id:        string;
  entityId:  number;
  label:     string;
  type:      string;
  lat:       number | null;
  lng:       number | null;
  initials:  string;

  // merged from PersonDetailDto (all nullable — API may not have data yet)
  photo:       string | null;
  title:       string | null;
  citizenship: string | null;
  education:   string | null;
  knownFor:    string | null;
  xHandle:     string | null;   // mapped from xUrl
  description: string | null;
  companyId:   number | null;
  companyName: string | null;
  companyLogo: string | null;
  countryId:   number | null;
  countryName: string | null;
  born:        string | null;
}

export interface PersonDegree {
  totalDegree:     number;
  criticalCount:   number;
  dependencyCount: number;
}

export interface PersonNeighbor {
  nodeId:   string;
  label:    string;
  nodeType: string;
  edgeType: string;
  strength: string;
}

// ─── Exported types used by PersonEntityPage ─────────────────────────────────

export type EntityType = 'Person' | 'Company' | 'Country' | 'Commodity' | 'Sector' | string;
export type EdgeType   = 'ownership' | 'supply' | 'governance' | 'financial' | 'alliance' | string;

export interface SubgraphNode {
  id:    string;
  label: string;
  type:  string;
  depth: number;
  x?:    number;
  y?:    number;
}

export interface PersonTimeline {
  id:              string;
  title:           string;
  probability:     number;
  divergenceType:  'bullish' | 'bearish' | 'neutral' | 'black_swan';
  edgeRiskScore:   number;
  volumeUsdc:      number;
  closeDate:       string;
  branchA:         string;
  branchB:         string;
}

export interface PersonNewsEvent {
  id:          string;
  headline:    string;
  source:      string;
  publishedAt: string;
  sentiment:   number;
  importance:  number;
  entities:    Array<{ id: string; name: string; type: string }>;
}

// ─── Utility functions ───────────────────────────────────────────────────────

export function formatUsdc(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function riskColor(score: number): string {
  if (score >= 75) return '#e53935';
  if (score >= 50) return '#d4a847';
  if (score >= 25) return '#00e5ff';
  return '#00e676';
}

export function edgeTypeColor(type: string): string {
  const map: Record<string, string> = {
    ownership:  '#8B5CF6',
    supply:     '#00e5ff',
    governance: '#d4a847',
    financial:  '#00e676',
    alliance:   '#3b8bd4',
  };
  return map[type] ?? '#888';
}

export function entityTypeColor(type: string): string {
  const map: Record<string, string> = {
    Person:    '#8B5CF6',
    Company:   '#00e5ff',
    Country:   '#d4a847',
    Commodity: '#00e676',
    Sector:    '#3b8bd4',
  };
  return map[type] ?? '#888';
}

export const DIVERGENCE_LABELS: Record<string, string> = {
  bullish:    'Bullish',
  bearish:    'Bearish',
  neutral:    'Neutral',
  black_swan: 'Black Swan',
};

export const DIVERGENCE_COLORS: Record<string, string> = {
  bullish:    '#00e676',
  bearish:    '#e53935',
  neutral:    '#3b8bd4',
  black_swan: '#8B5CF6',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "person:123"  →  123  (returns NaN if the format is wrong) */
function extractEntityId(personId: string): number {
  return parseInt(personId.replace('person:', ''), 10);
}

/** Build two-letter initials from a label string */
function toInitials(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── usePersonNode ─────────────────────────────────────────────────────────────
//
// Fetches the graph node AND the full PersonDetailDto in parallel, then merges
// them into a single PersonNode object.  The graph node provides id/type/lat/lng;
// the PersonDetailDto provides every display field.

export function usePersonNode(personId: string | null) {
  const [data,    setData]    = useState<PersonNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;

    const entityId = extractEntityId(personId);
    if (isNaN(entityId)) {
      setError(`Invalid personId format: "${personId}"`);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Fire both requests in parallel — neither blocks the other
        const [nodeRes, detailRes] = await Promise.allSettled([
          fetch(`${API_GRAPH}/graph/node/${personId}`).then(r => {
            if (!r.ok) throw new Error(`Graph node ${r.status}`);
            return r.json();
          }),
          personService.getById(entityId),   // already returns PersonDetailDto
        ]);

        if (cancelled) return;

        // Graph node is the authoritative source for id / type / coordinates
        const node = nodeRes.status === 'fulfilled' ? nodeRes.value : null;

        // PersonDetailDto enriches all display fields
        const detail = detailRes.status === 'fulfilled' ? detailRes.value : null;

        if (!node && !detail) {
          throw new Error('Both graph node and person detail requests failed');
        }

        const merged: PersonNode = {
          // ── from graph node ──────────────────────────────────────────────
          id:       node?.id       ?? personId,
          entityId: node?.entityId ?? entityId,
          label:    node?.label    ?? detail?.fullName ?? '',
          type:     node?.type     ?? 'Person',
          lat:      node?.lat      ?? null,
          lng:      node?.lng      ?? null,
          initials: toInitials(node?.label ?? detail?.fullName ?? ''),

          // ── from PersonDetailDto (rename photoUrl→photo, xUrl→xHandle) ──
          photo:       detail?.photoUrl    ?? null,
          title:       detail?.title       ?? null,
          citizenship: detail?.citizenship ?? null,
          education:   detail?.education   ?? null,
          knownFor:    detail?.knownFor    ?? null,
          xHandle:     detail?.xUrl        ?? null,
          description: detail?.description ?? null,
          companyId:   detail?.companyId   ?? null,
          companyName: detail?.companyName ?? null,
          companyLogo: detail?.companyLogo ?? null,
          countryId:   detail?.countryId   ?? null,
          countryName: detail?.countryName ?? null,
          born:        detail?.born        ?? null,
        };

        setData(merged);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [personId]);

  return { data, loading, error };
}

// ─── usePersonDegree ──────────────────────────────────────────────────────────

export function usePersonDegree(personId: string | null) {
  const [data,    setData]    = useState<PersonDegree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`${API_GRAPH}/graph/node/${personId}/degree`)
      .then(r => { if (!r.ok) throw new Error(`Degree ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [personId]);

  return { data, loading, error };
}

// ─── usePersonNeighbors ───────────────────────────────────────────────────────

export function usePersonNeighbors(personId: string | null) {
  const [data,    setData]    = useState<PersonNeighbor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`${API_GRAPH}/graph/node/${personId}/neighbors`)
      .then(r => { if (!r.ok) throw new Error(`Neighbors ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [personId]);

  return { data, loading, error };
}

// ─── usePersonSubgraph ────────────────────────────────────────────────────────

export function usePersonSubgraph(personId: string | null, depth = 2) {
  const [data,    setData]    = useState<{ nodes: unknown[]; edges: unknown[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`${API_GRAPH}/graph/node/${personId}/subgraph?depth=${depth}`)
      .then(r => { if (!r.ok) throw new Error(`Subgraph ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [personId, depth]);

  return { data, loading, error };
}

// ─── usePersonTimelines ───────────────────────────────────────────────────────

export function usePersonTimelines(personId: string | null) {
  const [data,    setData]    = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`${API_GRAPH}/graph/node/${personId}/timelines`)
      .then(r => { if (!r.ok) throw new Error(`Timelines ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [personId]);

  return { data, loading, error };
}

// ─── usePersonNews ────────────────────────────────────────────────────────────
//
// Was: setTimeout mock.  Now: real fetch against the EntityNews view endpoint.
// The GET /api/NewsEvents endpoint already accepts entityNodeId as a query param.

export function usePersonNews(personId: string | null, limit = 20) {
  const [data,    setData]    = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    setLoading(true);

    const url = `${API_GRAPH}/NewsEvents?entityNodeId=${encodeURIComponent(personId)}&limit=${limit}`;

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`News ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setData(Array.isArray(d) ? d : []); })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [personId, limit]);

  return { data, loading, error };
}

// ─── usePersonEdgeRisk ────────────────────────────────────────────────────────
//
// Was: setTimeout mock.  Now: real fetch against the new edge-risk endpoint
// (see GraphController.cs addition below).

export interface EdgeRiskEntry {
  edgeId:             string;
  targetNodeId:       string;
  targetLabel:        string;
  edgeType:           string;
  strength:           string;           // "Critical" | "High" | "Medium" | "Low"
  riskScore:          number;           // 0–100, computed on backend
  openTimelineCount:  number;
  timelineImpactCount: number;
  openTimelineIds:    string[];
}

export function usePersonEdgeRisk(personId: string | null) {
  const [data,    setData]    = useState<EdgeRiskEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`${API_GRAPH}/graph/node/${personId}/edge-risk`)
      .then(r => { if (!r.ok) throw new Error(`EdgeRisk ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setData(Array.isArray(d) ? d : []); })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [personId]);

  return { data, loading, error };
}

