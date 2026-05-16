/**
 * geoCluster.ts
 *
 * Cluster engine for the deck.gl _GlobeView. Replaces pixelSpread.ts.
 *
 * Architecture (this is iteration v4 — see GlobeBridge.ts header for the
 * full history of v1..v3):
 *
 *   v1  entitySpread.ts (geographic spread)         — deleted
 *   v2  screenDeclutter.ts (screen-space declutter) — deleted
 *   v3  pixelSpread.ts (hybrid pixel-offset)        — deleted
 *   v4  geoCluster.ts THIS FILE (cluster + expand-on-click)
 *
 * v4 abandons the "render every entity, spread visually" paradigm and
 * embraces "render semantic clusters as first-class objects". The user
 * sees a `[N]\nCity` badge per cluster; click expands children spiderfy-
 * style; click outside collapses. The trade-off it accepts: at low zoom
 * you can't see every individual entity, but you can see DENSITY (which
 * is the more useful signal for an intelligence-product globe).
 *
 * ─── Algorithm ────────────────────────────────────────────────────────────
 *
 *   1. Union-find by haversine distance with a zoom-dependent threshold.
 *      Pure geometry — no string keys, no backend dependency. Two entities
 *      A, B share a cluster iff haversine(A, B) <= clusterThresholdKm(zoom)
 *      OR there's a chain A-...-B of pairwise-close entities.
 *
 *   2. Optional `metroArea` SEMANTIC HINT: after union-find, additionally
 *      merge any two clusters that share the same `metroArea` string. This
 *      catches edge cases the threshold misses (Cupertino + Mountain View
 *      both tagged "Silicon Valley" but 18 km apart, which would fall out
 *      of the 8-km zoom-5 threshold).
 *
 *   3. Per cluster, derive:
 *        - center (lat, lng): metroLat/Lng of any member if present, else
 *                            arithmetic mean of children's lat/lng
 *        - label:             city of the highest-marketCap child if
 *                            available, else child name fallback
 *                            ("Apple +6 more")
 *        - sublabel:          countryIso2 of dominant child, or `+${n-1}`
 *        - dominantEntity:    highest marketCap (for company-led labels)
 *
 * ─── Why union-find primary, city as hint only ────────────────────────────
 *
 * Pure string grouping by city has well-known data-quality failure modes:
 *   - "Munich" vs "München", "New York" vs "NYC"
 *   - "Cupertino" + "Mountain View" + "Santa Clara" all belong to one
 *     semantic cluster but are three different city strings
 *   - Springfield exists in 31 US states; needs countryIso2 + cityRank
 *     disambiguation
 *
 * Distance-based clustering is robust to all of these. The metroArea hint
 * adds the only semantic refinement that matters in practice: forcing the
 * algorithm to recognize "this is one metro" when entities are slightly
 * too far apart in haversine space but are administratively/economically
 * the same.
 *
 * ─── Complexity ───────────────────────────────────────────────────────────
 *
 * O(n²) pairwise distance for union-find. For n=50 (iPM scale) that's
 * 2500 ops ≈ 0.1 ms. The metroArea pass is O(n²) too but with cheap
 * string comparisons. Runs once per CMD.SET_ENTITIES AND once per zoom
 * change (because the threshold is zoom-dependent). Both are infrequent.
 */

import type { EngineEntityData } from './contracts/inputs';

type RawEntity = EngineEntityData['entities'][number];

/** Output shape consumed by GlobeBridge layers. */
export interface Cluster {
  /** Stable id derived from member ids (`cluster:<sortedFirstId>`). */
  id: string;
  /** Centroid (cluster badge anchor) — metroLat/Lng if available, else mean. */
  lat: number;
  lng: number;
  /** Primary label: dominant entity's city if known, else dominant.name. */
  label: string;
  /** Sublabel: countryIso2 of dominant, or `+N more` when no city info. */
  sublabel: string;
  /** Children count (1 = solo cluster, badge collapses to a single icon). */
  count: number;
  /** All entities in this cluster, sorted by marketCap descending. */
  children: RawEntity[];
  /** The single most "important" child by marketCap (used for label & icon). */
  dominantEntity: RawEntity;
  /** Singleton flag — count === 1. UI may render solo clusters as a plain
   *  icon without the badge chrome (no `+N` sublabel). */
  isSingleton: boolean;
}

export interface GeoClusterOptions {
  /** Current camera zoom. Drives the dynamic threshold. */
  zoom: number;
  /** Override the default threshold curve (mainly for tests). km. */
  thresholdKmOverride?: number;
  /** Disable the metroArea merge pass (mainly for tests). Default false. */
  ignoreMetroAreaHint?: boolean;
}

/**
 * Dynamic cluster threshold by zoom level. Tighter at high zoom (user is
 * looking at one city) and looser at low zoom (user sees the globe and
 * wants regions/countries clustered together).
 *
 * Curve chosen from the Copilot review:
 *   z ≤ 2: 80 km   → continental overview: Bay Area is one cluster
 *   z ≤ 3: 40 km   → country-level zoom: SF and SJ still cluster
 *   z ≤ 4: 20 km   → metro zoom: Cupertino + Santa Clara cluster
 *   z >  4: 8 km   → city zoom: only same-neighborhood entities cluster
 *
 * At iPM's typical zoom 2 (globe overview) → 80 km, which is what we want.
 */
export function clusterThresholdKm(zoom: number): number {
  if (zoom <= 2) return 80;
  if (zoom <= 3) return 40;
  if (zoom <= 4) return 20;
  return 8;
}

const EARTH_R_KM = 6371;

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.sqrt(a));
}

/**
 * Union-find with path compression. Generic over the key type used to
 * identify a member; here we stringify entity ids since iPM mixes string
 * and number ids across PERSON / COMPANY / COUNTRY.
 */
class UnionFind {
  private parent = new Map<string, string>();

  add(key: string): void {
    if (!this.parent.has(key)) this.parent.set(key, key);
  }
  find(key: string): string {
    let curr = key;
    while (this.parent.get(curr)! !== curr) {
      const grandparent = this.parent.get(this.parent.get(curr)!)!;
      this.parent.set(curr, grandparent);
      curr = grandparent;
    }
    return curr;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

/**
 * Sort entities by descending marketCap. Used to pick the dominant member
 * of a cluster (label + cluster-anchor icon). For PERSON entities (no
 * marketCap) we use the compositeScore-like proxy: a PERSON with company
 * info is "more important" than a politician proxy because companies
 * carry deeper data in the overlay. For pure tie-break we fall back to id.
 */
function compareByImportance(a: RawEntity, b: RawEntity): number {
  const aCap = a.marketCapUsd ?? 0;
  const bCap = b.marketCapUsd ?? 0;
  if (aCap !== bCap) return bCap - aCap;
  // Tie-break: COMPANY > PERSON > COUNTRY (companies anchor cluster icons
  // because they have the recognizable logos via iconUrl).
  const typeRank = (t: string) =>
    t === 'COMPANY' ? 0 : t === 'PERSON' ? 1 : 2;
  const tr = typeRank(a.type) - typeRank(b.type);
  if (tr !== 0) return tr;
  return String(a.id).localeCompare(String(b.id));
}

/**
 * Build clusters from a flat entity array.
 *
 * Deterministic — same input array (in any order) produces the same set
 * of clusters with the same ids and the same dominantEntity per cluster.
 */
export function geoCluster(
  entities: RawEntity[],
  options: GeoClusterOptions,
): Cluster[] {
  if (entities.length === 0) return [];

  const threshold = options.thresholdKmOverride ?? clusterThresholdKm(options.zoom);
  const uf = new UnionFind();
  for (const e of entities) uf.add(String(e.id));

  // ─── Pass 1: pairwise haversine ─────────────────────────────────────────
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      if (haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) <= threshold) {
        uf.union(String(a.id), String(b.id));
      }
    }
  }

  // ─── Pass 2: metroArea hint (optional) ──────────────────────────────────
  //
  // After geometric union-find, any two entities sharing a metroArea string
  // (case-insensitive trim) are merged regardless of distance. This catches
  // "Silicon Valley" entities that fall just outside the 8 km zoom-5
  // threshold and would otherwise split into separate clusters.
  if (!options.ignoreMetroAreaHint) {
    const byMetro = new Map<string, string[]>();  // metro → [entityId, ...]
    for (const e of entities) {
      if (!e.metroArea) continue;
      const key = e.metroArea.trim().toLowerCase();
      const arr = byMetro.get(key) ?? [];
      arr.push(String(e.id));
      byMetro.set(key, arr);
    }
    for (const ids of byMetro.values()) {
      if (ids.length < 2) continue;
      const first = ids[0];
      for (let i = 1; i < ids.length; i++) uf.union(first, ids[i]);
    }
  }

  // ─── Materialize clusters ───────────────────────────────────────────────
  const byRoot = new Map<string, RawEntity[]>();
  for (const e of entities) {
    const root = uf.find(String(e.id));
    const arr = byRoot.get(root) ?? [];
    arr.push(e);
    byRoot.set(root, arr);
  }

  const clusters: Cluster[] = [];
  for (const [, members] of byRoot) {
    members.sort(compareByImportance);
    const dominant = members[0];
    const count = members.length;

    // Cluster id: stable across re-clustering as long as the dominant
    // child doesn't change. Using dominant.id (the most-important member)
    // means a cluster keeps its id when an unimportant member joins/leaves
    // — important for the spiderfy expand state to survive re-clustering.
    const id = `cluster:${dominant.id}`;

    // Centroid anchor preference:
    //   1. metroLat/Lng of the dominant entity (most "canonical" point)
    //   2. cityLat/Lng of the dominant entity
    //   3. arithmetic mean of all members' lat/lng (always defined)
    let lat: number, lng: number;
    if (dominant.metroLat != null && dominant.metroLng != null) {
      lat = dominant.metroLat;
      lng = dominant.metroLng;
    } else if (dominant.cityLat != null && dominant.cityLng != null) {
      lat = dominant.cityLat;
      lng = dominant.cityLng;
    } else {
      lat = members.reduce((s, m) => s + m.latitude,  0) / count;
      lng = members.reduce((s, m) => s + m.longitude, 0) / count;
    }

    // Label preference (free of backend dependency at every level):
    //   1. dominant.city  →  "Munich"
    //   2. dominant.name  →  "BMW" (fallback when city is missing)
    const label = dominant.city ?? dominant.name;

    // Sublabel:
    //   - solo cluster (count=1): "" — UI suppresses the badge entirely
    //   - cluster + countryIso2 on dominant: "+5 · DE"
    //   - cluster without country: "+5"
    const isSingleton = count === 1;
    const sublabel = isSingleton
      ? ''
      : dominant.countryIso2
        ? `+${count - 1} · ${dominant.countryIso2}`
        : `+${count - 1}`;

    clusters.push({
      id,
      lat,
      lng,
      label,
      sublabel,
      count,
      children:       members,
      dominantEntity: dominant,
      isSingleton,
    });
  }

  // Stable order: clusters sorted by dominant's importance descending. This
  // makes deck.gl layer data arrays deterministic (important picking comes
  // first in the array, so re-mounts pick the same way).
  clusters.sort((a, b) => compareByImportance(a.dominantEntity, b.dominantEntity));

  return clusters;
}
