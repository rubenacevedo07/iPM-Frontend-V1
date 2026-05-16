/**
 * spiderfy.ts
 *
 * Pure helper that returns pixel offsets for spiderfy-expanded children
 * of a cluster on the deck.gl _GlobeView. Geometric only — no coupling
 * to deck.gl types, no I/O.
 *
 * Two layout strategies, picked by member count:
 *
 *   N ≤ 12  →  single-ring golden-angle (137.508°) at radius 36 px
 *   N >  12 →  multi-ring (6 / 10 / 14 / 18 per ring) at increasing radii
 *
 * Golden-angle spacing is the standard spiderfy choice from Leaflet's
 * markercluster plugin: it produces a visually-irregular but maximally-
 * spread layout that avoids the "starburst" look of evenly-spaced rings.
 *
 * Multi-ring is needed for N > 12 because at 36 px and 12 items the
 * children start overlapping; instead of growing the radius (which
 * pushes the cluster off-screen at high zoom and looks weird) we move
 * later children to a wider ring.
 *
 * The returned offsets are in PIXELS, suitable for IconLayer's
 * `getPixelOffset` accessor (deck.gl pixel coordinate system: positive
 * X right, positive Y DOWN, origin = projected lat/lng of the anchor).
 */

/** Single offset entry. Pixel deltas from the cluster anchor. */
export interface PixelOffset {
  /** Index in the children array (matches caller's iteration). */
  index: number;
  /** Pixel offset.x — positive moves right on screen. */
  dx: number;
  /** Pixel offset.y — positive moves DOWN on screen (deck.gl convention). */
  dy: number;
}

const GOLDEN_ANGLE_RAD = (137.508 * Math.PI) / 180;

/** Ring config: max items at this ring + radius in px. Outer rings hold
 *  more items because their circumference is larger. */
const RINGS: ReadonlyArray<{ capacity: number; radius: number }> = [
  { capacity: 12, radius: 36 },   // ring 0: up to 12 items @ 36 px
  { capacity: 10, radius: 64 },   // ring 1: next 10 items @ 64 px
  { capacity: 14, radius: 92 },   // ring 2: next 14 items @ 92 px
  { capacity: 18, radius: 120 },  // ring 3: next 18 items @ 120 px
  { capacity: 22, radius: 148 },  // ring 4: next 22 items @ 148 px (cap)
];

/** Cap on total spiderfy children. Anything beyond this is dropped from
 *  the spiderfy view and accessible only via search. iPM datasets cap at
 *  ~50 so a 76-slot capacity is comfortable headroom. */
const MAX_SPIDERFY_CHILDREN = 12 + 10 + 14 + 18 + 22; // 76

/**
 * Compute pixel offsets for `count` children. Returned array is exactly
 * `min(count, MAX_SPIDERFY_CHILDREN)` long, indexed by child position
 * after the caller's importance sort (so child[0] = closest to dominant).
 */
export function getSpiderfyOffsets(count: number): PixelOffset[] {
  const effective = Math.min(count, MAX_SPIDERFY_CHILDREN);
  const offsets: PixelOffset[] = [];

  if (effective <= 12) {
    // ─── Single-ring golden-angle ──────────────────────────────────────
    const radius = RINGS[0].radius;
    for (let i = 0; i < effective; i++) {
      const angle = i * GOLDEN_ANGLE_RAD;
      offsets.push({
        index: i,
        dx: Math.cos(angle) * radius,
        // Negative dy because deck.gl pixel-Y points down; we want the
        // first child to render ABOVE the cluster anchor for visual
        // balance with the cluster badge below the icon.
        dy: -Math.sin(angle) * radius,
      });
    }
    return offsets;
  }

  // ─── Multi-ring golden-angle ──────────────────────────────────────────
  //
  // For each ring, distribute its capacity at evenly-spaced angles offset
  // by a per-ring phase. Why even spacing inside a ring instead of more
  // golden angle: at high counts the golden-angle pattern produces some
  // very close pairs at low ring indices, but even spacing per ring +
  // phase offset per ring gives a clean concentric look that scales.
  let placed = 0;
  for (let r = 0; r < RINGS.length && placed < effective; r++) {
    const ring = RINGS[r];
    const remaining = effective - placed;
    const onThisRing = Math.min(ring.capacity, remaining);
    const angleStep = (2 * Math.PI) / onThisRing;
    // Phase offset: half-step per ring so adjacent rings don't align.
    const phaseOffset = (r % 2) * (angleStep / 2);
    for (let k = 0; k < onThisRing; k++) {
      const angle = k * angleStep + phaseOffset;
      offsets.push({
        index: placed + k,
        dx: Math.cos(angle) * ring.radius,
        dy: -Math.sin(angle) * ring.radius,
      });
    }
    placed += onThisRing;
  }

  return offsets;
}
