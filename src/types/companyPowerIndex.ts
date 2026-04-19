/**
 * companyPowerIndex.ts — types/companyPowerIndex.ts
 *
 * Canonical shape for GET /api/CompanyPowerIndex/{companyId}.
 * Backend verified via curl 2026-04-19 (NVIDIA id=1, Palantir id=96).
 *
 * The endpoint also includes a nested `company` object on the response;
 * consumers needing full company data should call GET /api/Companies/{id}
 * separately. The nested field is tolerated (TS does not error on extra
 * response properties) but not declared here to keep the primary shape lean.
 */

export type Archetype =
  | 'FINANCIAL'
  | 'POLITICAL'
  | 'COERCIVE'
  | 'INDUSTRIAL'
  | 'TECHNOLOGICAL'
  | 'HYBRID';

export type TrendDirection = 'rising' | 'stable' | 'declining';

export interface CompanyPowerIndex {
  id:                  number;
  companyId:           number;
  archetypeCode:       Archetype;

  /** 6 power dimensions, 0-100 scale */
  financialScore:      number;
  militaryScore:       number;
  politicalScore:      number;
  technologicalScore:  number;
  industrialScore:     number;
  informationScore:    number;

  /** Weighted composite of the 6 dimensions, 0-100 scale */
  compositeScore:      number;

  /** Declared tiers per dimension. Null when not tiered. */
  politicalTier:       number | null;
  militaryTier:        number | null;
  financialTier:       number | null;

  /** Rankings — null until batch-computed */
  globalRank:          number | null;
  archetypeRank:       number | null;

  computedAt:          string;   // ISO timestamp
  computationMethod:   string;

  trendDirection:      TrendDirection;
  /** Previous composite — null on first computation */
  compositeScorePrev:  number | null;
}

/**
 * Observed tiers — shape for GET /api/CompanyPowerIndex/{companyId}/tiers.
 * Backend verified via curl 2026-04-19. Returns the *observed* tier per
 * dimension, which can diverge from the declared tier in CompanyPowerIndex
 * (e.g. NVIDIA politicalTier declared=2, observed=3 due to edge density).
 */
export interface CompanyTiers {
  companyId:     number;
  companyName:   string;
  politicalTier: number | null;
  militaryTier:  number | null;
  financialTier: number | null;
}
