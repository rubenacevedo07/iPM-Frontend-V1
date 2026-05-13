/**
 * pixelSpread.ts
 *
 * Hybrid decluttering for deck.gl entities on _GlobeView.
 *
 *   geographic clustering (stable in time, doesn't change with camera)
 *     +
 *   per-cluster multi-ring layout in SCREEN PIXELS (constant pixel separation
 *   regardless of zoom)
 *
 * ─── Why this design ──────────────────────────────────────────────────────
 *
 * Two prior approaches failed on _GlobeView:
 *
 *  (1) Pure geographic spread (entitySpread.ts, 200/340/480 km rings):
 *      Stable but the spread amount was fixed in METERS, so at zoom 3.5+ the
 *      ring members ended up across an ocean. And it required fake
 *      displayLat/displayLng on the data model + an arc-rebind step.
 *
 *  (2) Pure screen-space spread (screenDeclutter.ts, viewport.project /
 *      unproject every frame, bbox collisions): The projection changes every
 *      frame during rotation, so collision groups formed and dissolved
 *      continuously, the per-frame layout reassigned slots, and icons
 *      visibly "danced". Plus viewport.unproject near the globe limb returned
 *      garbage lat/lng.
 *
 * This file is the synthesis:
 *
 *   - Clustering uses GEOGRAPHIC distance (50 km union-find by default), so
 *     a cluster's IDENTITY is stable — the same N entities are always grouped
 *     together, regardless of camera state. No jitter on rotation/zoom.
 *
 *   - Layout INSIDE a cluster uses PIXEL units (32/56/80 px radii). The
 *     spread is consumed by IconLayer's `getPixelOffset` prop, which leaves
 *     the icon's geographic anchor at the REAL HQ lat/lng but shifts the
 *     rendered sprite by those pixels in screen space. Zoom changes how far
 *     30 km feels in screen space, but the spread STAYS exactly 32-80 px
 *     apart — visually consistent at every zoom.
 *
 *   - viewport.project / unproject are NOT used. There is no per-frame
 *     dependency on the camera. The function runs ONCE per CMD.SET_ENTITIES
 *     and the result is cached on the bridge.
 *
 * ─── ScatterplotLayer co-location ──────────────────────────────────────────
 *
 * The decorative rings + dots (ScatterplotLayer) live on the REAL HQ
 * longitude/latitude (this layer has no `getPixelOffset` prop). So for a
 * cluster of N entities all sharing a small geographic area:
 *
 *   - N rings overlap at the cluster's center on screen (because the
 *     real HQs are within ~50 km, which is <~10 px at zoom 1.5).
 *   - N icons spread at 32-80 px around them.
 *
 * Picking stays on the ring layer AND the icon layer (icon now `pickable:
 * true` in GlobeBridge). When the user clicks a logo, the icon catches the
 * hit at its offset position; when they click the overlapping ring stack,
 * deck.gl picks the topmost ring by draw order (the `orderedVisible` array
 * in GlobeBridge puts focus + non-focus together so neighbors win on
 * overlap). The "data-true ring at HQ + visually-offset icon" pattern reads
 * the same way Google Maps cluster pills do.
 *
 * ─── Determinism ───────────────────────────────────────────────────────────
 *
 * Each cluster's members are sorted by stringified id (`localeCompare`)
 * before assignment. The same input → same output regardless of insertion
 * order, hash randomization, or platform. No jitter on re-mount; no shifting
 * when an unrelated cluster grows or shrinks.
 *
 * ─── Performance ───────────────────────────────────────────────────────────
 *
 *   - O(n²) for the union-find clustering (n² pairwise distance checks).
 *   - O(n) for the ring assignment.
 *
 * Total: O(n²). For n=50 (iPM today) that's 2500 distance checks ≈ 0.1 ms
 * on a Macbook. Runs ONCE at SET_ENTITIES; cached afterwards. The previous
 * screen-space version ran every frame (60 Hz × per-frame projection); this
 * one runs ~once per app session. For ≥500 entities, a grid broad-phase
 * would drop clustering to O(n) — but that's not needed at iPM's scale.
 */

export interface BaseEntity {
  id:        string | number;
  longitude: number;
  latitude:  number;
}

/**
 * The single field that pixelSpread() adds. Intersected with T in
 * `Declutterd<T>` below so the entity keeps its original shape unchanged —
 * notably its REAL longitude/latitude, which are the source of truth for
 * the rest of the rendering pipeline (arcs, hemisphere filter, ScatterplotLayer).
 */
export interface DeclutterFields {
  pixelOffset: [number, number];
}

export type Declutterd<T extends BaseEntity> = T & DeclutterFields;

export interface PixelSpreadOptions {
  /**
   * Geographic distance (meters) within which two entities are considered
   * close enough to potentially collide on screen → grouped. Default 50_000.
   * Independent of zoom — at zoom 1.5 a 50 km cluster is ~10 px wide on
   * screen; at zoom 3.5 it's ~80 px. The pixel spread stays the same
   * regardless because cluster identity is stable.
   */
  clusterMeters?: number;
  /**
   * Pixel radii for ring 1, 2, 3 (... extend if you need more rings).
   * Default [32, 56, 80]. The first 6 entities of a cluster land on ring 1
   * at 32 px, the next 10 on ring 2 at 56 px, and so on.
   */
  ringRadiiPx?: number[];
  /**
   * Maximum entities per ring before overflow to the next ring. Default
   * [6, 10, 14] (matches the OG entitySpread.ts ring caps). With 30
   * entities all in one cluster, you'd fill ring 1+2+3 (6+10+14=30) without
   * overflow.
   */
  ringCaps?: number[];
  /**
   * Bearing offset (radians) for the FIRST slot of each ring. Default
   * [0, π/6, π/12] (0°, 30°, 15°) so neighboring rings don't visually align
   * radially — gives the spread a slightly braided look that reads less
   * geometric than a perfect grid.
   */
  ringStartRadians?: number[];
}

const EARTH_R_M = 6_371_000;

function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = EARTH_R_M;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Union-find connected-components clustering. Two entities A, B are in the
 * same cluster iff haversine(A, B) ≤ threshold OR there exists a chain
 * A-C-D-...-B where each link is ≤ threshold (transitive closure).
 *
 * Stringifies ids because callers may mix string/number ids (iPM uses
 * `id: number` on the entity shape but the union-find map needs a stable
 * primitive key).
 */
function buildClusters<T extends BaseEntity>(
  entities: T[],
  thresholdM: number,
): T[][] {
  const parent = new Map<string, string>(
    entities.map((e) => [String(e.id), String(e.id)]),
  );

  function find(id: string): string {
    while (parent.get(id) !== id) {
      const gp = parent.get(parent.get(id)!)!;
      parent.set(id, gp);
      id = gp;
    }
    return id;
  }

  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      if (
        haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude)
        <= thresholdM
      ) {
        union(String(a.id), String(b.id));
      }
    }
  }

  const groups = new Map<string, T[]>();
  for (const e of entities) {
    const root = find(String(e.id));
    const arr  = groups.get(root) ?? [];
    arr.push(e);
    groups.set(root, arr);
  }
  return [...groups.values()];
}

/**
 * Lays a cluster of N entities out on concentric rings of pixel offsets,
 * centred on the entity's own real lat/lng (NOT on the cluster centroid —
 * each entity stays anchored to its OWN HQ, the offset just shifts the
 * rendered sprite).
 *
 *   - Ring 0 starts at 12 o'clock (screen y is inverted in pixel offsets,
 *     so bearing=0 maps to dy = -radius).
 *   - Subsequent rings start at the ringStartRadians offset to break the
 *     pure-radial alignment.
 *
 * Solo entities (cluster size 1) get pixelOffset [0, 0] — no displacement,
 * the icon sits exactly on its real HQ.
 */
function layoutCluster<T extends BaseEntity>(
  cluster: T[],
  ringRadiiPx: number[],
  ringCaps: number[],
  ringStartRadians: number[],
): Declutterd<T>[] {
  const sorted = [...cluster].sort((a, b) =>
    String(a.id).localeCompare(String(b.id)),
  );

  if (sorted.length === 1) {
    return [{ ...sorted[0], pixelOffset: [0, 0] } as Declutterd<T>];
  }

  const result: Declutterd<T>[] = [];

  let filled = 0;
  for (let r = 0; r < ringRadiiPx.length && filled < sorted.length; r++) {
    const cap    = ringCaps[r] ?? Infinity;
    const inRing = sorted.slice(filled, filled + cap);
    const start  = ringStartRadians[r] ?? 0;
    const radius = ringRadiiPx[r];

    inRing.forEach((entity, i) => {
      const bearing = start + (i / inRing.length) * 2 * Math.PI;
      // Screen y points DOWN, so we negate the cosine to put bearing=0 at
      // 12 o'clock visually (a slot directly above the cluster center).
      const dx =  Math.sin(bearing) * radius;
      const dy = -Math.cos(bearing) * radius;
      result.push({
        ...entity,
        pixelOffset: [dx, dy] as [number, number],
      } as Declutterd<T>);
    });

    filled += inRing.length;
  }

  return result;
}

/**
 * Top-level entry point. Group entities by geographic proximity, then assign
 * each entity a deterministic pixel offset within its group.
 *
 * Idempotent given identical input — the same array of entities (regardless
 * of order) yields the same { id → pixelOffset } map.
 */
export function pixelSpread<T extends BaseEntity>(
  entities: T[],
  options: PixelSpreadOptions = {},
): Declutterd<T>[] {
  if (entities.length === 0) return [];

  const clusterMeters    = options.clusterMeters    ?? 50_000;
  const ringRadiiPx      = options.ringRadiiPx      ?? [32, 56, 80];
  const ringCaps         = options.ringCaps         ?? [6, 10, 14];
  const ringStartRadians = options.ringStartRadians ?? [0, Math.PI / 6, Math.PI / 12];

  return buildClusters(entities, clusterMeters).flatMap((cluster) =>
    layoutCluster(cluster, ringRadiiPx, ringCaps, ringStartRadians),
  );
}
