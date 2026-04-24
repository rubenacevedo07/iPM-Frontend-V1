/**
 * regionColors.ts
 * Shared colour definitions for map region (continent/subregion) fills.
 * Used by useMapLayers, useIntelligenceMapLayers, and UI panels.
 */

/** DeckGL RGBA tuples for GeoJSON fills */
export const REGION_RGBA: Record<string, [number, number, number, number]> = {
  "europe":           [  0, 212, 170, 140],  // teal
  "north america":    [255, 140,   0, 140],  // orange
  "asia":             [255,  60,  60, 140],  // red
  "africa":           [255, 200,   0, 140],  // gold
  "south america":    [ 68, 200, 100, 140],  // green
  "latin america":    [ 68, 200, 100, 140],  // green (alias)
  "oceania":          [ 68, 170, 255, 140],  // sky blue
  "middle east":      [153,  85, 255, 140],  // purple
  "western asia":     [153,  85, 255, 140],  // purple (Natural Earth alias)
};

/** CSS hex strings — same palette, used in JSX */
export const REGION_HEX: Record<string, string> = {
  "europe":           "#00d4aa",
  "north america":    "#ff8c00",
  "asia":             "#ff3c3c",
  "africa":           "#ffc800",
  "south america":    "#44c864",
  "latin america":    "#44c864",
  "oceania":          "#44aaff",
  "middle east":      "#9955ff",
  "western asia":     "#9955ff",
};

const BASE_FILL:   [number, number, number, number] = [20, 20, 30, 200];
const DEFAULT_HEX  = "#0f62fe";

export function getRegionRgba(name: string): [number, number, number, number] {
  return REGION_RGBA[name.toLowerCase()] ?? BASE_FILL;
}

export function getRegionHex(name: string): string {
  return REGION_HEX[name.toLowerCase()] ?? DEFAULT_HEX;
}
