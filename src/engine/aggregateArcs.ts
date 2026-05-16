/**
 * aggregateArcs.ts
 *
 * Pure function that collapses individual EngineArcs into one
 * AggregatedArc per (sourceClusterId, targetClusterId) pair. Used by
 * GlobeBridge when no cluster is expanded — the user sees one thick arc
 * with a `[12]` count badge from "Munich" to "London" instead of twelve
 * overlapping faint lines.
 *
 * When a cluster IS expanded (e.g., user clicked Munich), the bridge
 * switches to rendering INDIVIDUAL arcs for that cluster's children so
 * the user can see exactly which BMW supplier in Munich goes to which
 * UK partner. The transition between the two layers is a fade (no
 * geometric morph — morphing would require interpolating endpoints
 * which is visually ambiguous when N > 2).
 *
 * ─── Scaling ─────────────────────────────────────────────────────────────
 *
 * Arc width = base + k · √(Σintensity). Square-root is the right scaling
 * function here because:
 *
 *   - Linear sum (Σintensity directly): a cluster with 50 arcs would
 *     render at ~20× the width of a 2-arc cluster. That's correct
 *     "information mass" but visually it dominates the globe and pixel-
 *     blows the strokes (deck.gl ArcLayer caps at ~12 px before fragment
 *     shader artifacts).
 *
 *   - Logarithmic (log(1+Σ)): too aggressive flattening — 1 vs 50 arcs
 *     reads as roughly the same width. Loses the density signal.
 *
 *   - Square-root: the standard for symbol-map scaling (Tufte, ggplot
 *     scale_size_area). A 50-arc cluster reads ~7× wider than a 2-arc
 *     cluster — informative without dominating.
 *
 * The `count` label on the arc is the RAW integer count (not √ count)
 * because numeric labels must be honest. Width is for perception, label
 * is for precision.
 *
 * ─── Endpoint preservation ───────────────────────────────────────────────
 *
 * Aggregated arc endpoints are the cluster centroids (the cluster's
 * `lat`/`lng` — which equals metroLat/Lng if available, else mean of
 * children's HQ). NOT the haversine midpoint of all child endpoints,
 * because that drifts off the cluster badge position on the globe.
 *
 * ─── Self-loops ──────────────────────────────────────────────────────────
 *
 * Self-loops (sourceClusterId === targetClusterId) are DROPPED at
 * aggregation time. They happen when two entities in the same cluster
 * (e.g., Apple + Google in Bay Area) have arcs between them; rendering
 * a self-loop arc on the cluster centroid is geometrically degenerate
 * (it would render as a vertical line from the cluster to itself). The
 * user sees them again when the cluster is expanded — they become two
 * normal arcs between the spiderfy children.
 */

import type { EngineArc } from './contracts/inputs';
import type { Cluster } from './geoCluster';

/** Aggregated arc output. Shaped to plug straight into deck.gl ArcLayer
 *  accessors (`getSourcePosition`, `getTargetPosition`, `getWidth`). */
export interface AggregatedArc {
  /** Stable id `aggArc:${sortedClusterPair}` for layer-update keying. */
  arcId: string;
  /** Source cluster id (matches Cluster.id). */
  sourceClusterId: string;
  /** Target cluster id (matches Cluster.id). */
  targetClusterId: string;
  /** Source cluster centroid [lng, lat]. */
  source: [number, number];
  /** Target cluster centroid [lng, lat]. */
  target: [number, number];
  /** Number of underlying individual arcs in this group. The visible label. */
  count: number;
  /** Sum of underlying intensities. Drives the width via √ scaling below. */
  totalIntensity: number;
  /** Pre-computed display width in PIXELS. Caller passes to getWidth. */
  width: number;
  /** The single most-intense underlying arc kind (for color). */
  dominantKind: EngineArc['kind'];
}

/** Width tuning. Empirical — tested against typical iPM densities (1..40
 *  arcs per cluster pair) to land in the 1.5..10 px range that ArcLayer
 *  renders crisply. */
const WIDTH_BASE = 1.5;
const WIDTH_K    = 1.4;

/**
 * Collapse individual arcs into aggregated arcs per cluster pair.
 *
 * @param arcs        All EngineArcs (typically the bridge's full arc set).
 * @param clusters    All Clusters from geoCluster() — used to look up
 *                    each entity id → cluster id.
 * @returns           One AggregatedArc per cluster pair with ≥1 underlying
 *                    arc, sorted by descending count for stable rendering.
 */
export function aggregateArcs(
  arcs:     readonly EngineArc[],
  clusters: readonly Cluster[],
): AggregatedArc[] {
  if (arcs.length === 0 || clusters.length === 0) return [];

  // Build entityId → clusterId index. O(total children) = O(entities).
  const entityToCluster = new Map<string, Cluster>();
  for (const c of clusters) {
    for (const child of c.children) {
      entityToCluster.set(String(child.id), c);
    }
  }

  /** Internal accumulator before computing widths. */
  interface Accumulator {
    sourceCluster: Cluster;
    targetCluster: Cluster;
    count: number;
    totalIntensity: number;
    kindCounts: Map<EngineArc['kind'], number>;
  }

  const byPair = new Map<string, Accumulator>();

  for (const arc of arcs) {
    const sc = entityToCluster.get(arc.sourceNodeId);
    const tc = entityToCluster.get(arc.targetNodeId);

    // Skip arcs whose endpoints aren't in any cluster (entity was removed
    // between CMD.SET_ENTITIES and CMD.SET_ARCS — race condition that
    // happens on overlay-close while a new entity batch is in-flight).
    if (!sc || !tc) continue;

    // Drop self-loops (see header). Saves layer cost and avoids a deck.gl
    // ArcLayer warning about degenerate geometry.
    if (sc.id === tc.id) continue;

    const key = `${sc.id}->${tc.id}`;
    let acc = byPair.get(key);
    if (!acc) {
      acc = {
        sourceCluster:  sc,
        targetCluster:  tc,
        count:          0,
        totalIntensity: 0,
        kindCounts:     new Map(),
      };
      byPair.set(key, acc);
    }
    acc.count          += 1;
    acc.totalIntensity += arc.intensity;
    acc.kindCounts.set(arc.kind, (acc.kindCounts.get(arc.kind) ?? 0) + 1);
  }

  const result: AggregatedArc[] = [];
  for (const [key, acc] of byPair) {
    // Pick dominant kind (most-frequent). Ties broken by enum order:
    // supplier > client > partner > connection (reflects iPM's
    // "supply chain primacy" heuristic — see overlay specs).
    const kindOrder: EngineArc['kind'][] = ['supplier', 'client', 'partner', 'connection'];
    let dominantKind: EngineArc['kind'] = 'connection';
    let bestCount = -1;
    for (const k of kindOrder) {
      const c = acc.kindCounts.get(k) ?? 0;
      if (c > bestCount) {
        bestCount = c;
        dominantKind = k;
      }
    }

    result.push({
      arcId:           `aggArc:${key}`,
      sourceClusterId: acc.sourceCluster.id,
      targetClusterId: acc.targetCluster.id,
      source:          [acc.sourceCluster.lng, acc.sourceCluster.lat],
      target:          [acc.targetCluster.lng, acc.targetCluster.lat],
      count:           acc.count,
      totalIntensity:  acc.totalIntensity,
      width:           WIDTH_BASE + WIDTH_K * Math.sqrt(acc.totalIntensity),
      dominantKind,
    });
  }

  // Stable order: most-populous pairs render last (= on top), so dense
  // routes always win the z-fight at the cluster centroid.
  result.sort((a, b) => a.count - b.count);

  return result;
}
