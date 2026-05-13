// src/utils/geoDistance.ts
//
// Tiny geo helper used to detect "colocated" entities (e.g. a CEO and their
// company headquarters at the same lat/lon). Spherical-Earth approximation —
// accurate enough for the headquarters detection window (~50 km threshold).

const EARTH_RADIUS_KM = 6371

const toRad = (deg: number): number => (deg * Math.PI) / 180

/** Great-circle distance between two (lat, lon) pairs, in kilometres. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Geodesic destination point from origin, given bearing (radians) and
 * distance (km). Returns { lat, lng } in degrees.
 */
export function destinationKm(
  lat: number,
  lng: number,
  distKm: number,
  bearingRad: number,
): { lat: number; lng: number } {
  const R  = EARTH_RADIUS_KM
  const δ  = distKm / R
  const φ1 = toRad(lat)
  const λ1 = toRad(lng)
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(bearingRad),
  )
  const λ2 = λ1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
  )
  return {
    lat: φ2 * (180 / Math.PI),
    lng: ((λ2 * (180 / Math.PI)) + 540) % 360 - 180,
  }
}

/**
 * Place a person dot within their country, avoiding company HQ positions.
 *
 * Strategy:
 * - Start at bearing = (id * 137.5°) mod 360 — golden-angle spacing so
 *   consecutive IDs never cluster, distributed around the country centroid.
 * - Distance: 350 km from centroid (readable as "same country" at zoom 1.5).
 * - If the candidate position is within MIN_CLEAR_KM of any company HQ,
 *   rotate the bearing by STEP_RAD and retry up to MAX_TRIES times.
 */
const SPREAD_KM    = 350
const MIN_CLEAR_KM = 180   // minimum clearance from any company dot
const STEP_RAD     = Math.PI / 6   // 30° rotation per retry
const MAX_TRIES    = 12

export function placePersonDot(
  personId: number,
  countryLat: number,
  countryLng: number,
  companyCoords: Array<{ latitude: number; longitude: number }>,
): { lat: number; lng: number } {
  // Golden-angle seed: spreads IDs evenly around the circle
  const seedBearing = ((personId * 137.508) % 360) * (Math.PI / 180)

  for (let i = 0; i < MAX_TRIES; i++) {
    const bearing = seedBearing + i * STEP_RAD
    const candidate = destinationKm(countryLat, countryLng, SPREAD_KM, bearing)

    const tooClose = companyCoords.some(
      c => haversineKm(candidate.lat, candidate.lng, c.latitude, c.longitude) < MIN_CLEAR_KM,
    )
    if (!tooClose) return candidate
  }

  // All slots occupied — fall back to seed direction (better than centroid pile-up)
  return destinationKm(countryLat, countryLng, SPREAD_KM, seedBearing)
}
