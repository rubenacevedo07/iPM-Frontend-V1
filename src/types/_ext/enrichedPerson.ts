// Shape of /data/persons_top_15_enriched.json — research-enriched top-15 persons
// with real signals, connections, clients/partners and complete key data.
//
// Rule 1 compliant: lives in src/types/_ext/ (justified — represents the
// curated enrichment artifact, not a backend DTO).

export type EnrichedStrength = 'Critical' | 'High' | 'Medium' | 'Low'

export type EnrichedSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface EnrichedSignal {
  source:      string
  publishedAt: string
  headline:    string
  severity:    EnrichedSeverity
}

export interface EnrichedConnection {
  name:     string
  role:     string
  edgeType: string
  strength: EnrichedStrength
}

export interface EnrichedPersonLocation {
  latitude:        number
  longitude:       number
  city:            string
  countryIso2:     string
  countryName:     string
  metroArea:       string
  cityLat:         number
  cityLng:         number
  metroLat:        number
  metroLng:        number
  precisionLevel:  'CITY' | 'METRO' | 'COUNTRY'
  citizenshipIso2: string
  industry:        string
}

export interface EnrichedPerson {
  id:              number
  fullName:        string
  title:           string
  netWorthUsd:     number | null
  globalRank:      number | null
  archetypeCode:   string | null
  influenceDomain: string | null
  citizenship:     string | null
  born:            string | null
  signals:         EnrichedSignal[]
  connections:     EnrichedConnection[]
  clientsPartners: EnrichedConnection[]
  location?:       EnrichedPersonLocation
  _unverified?:    string[]
}
