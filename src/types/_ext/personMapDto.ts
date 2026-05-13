export interface PersonMapDto {
  id: number
  nodeId: string
  type: 'PERSON'
  slug: string
  fullName: string
  photoUrl: string | null
  companyName: string | null
  countryLat: number | null
  countryLng: number | null
  compositeScore: number
  title:           string | null
  globalRank:      number | null
  archetypeCode:   string | null
  influenceDomain: string | null
  citizenship:     string | null
  born:            string | null
  netWorthUsd:     number | null
}
