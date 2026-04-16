/**
 * countryDependency.ts  —  types/countryDependency.ts
 *
 * TypeScript interfaces for the CountryDependency API.
 *
 * Endpoints:
 *   GET /api/CountryDependency                → CountryDependencyProfile[]
 *   GET /api/CountryDependency/{id}           → CountryDependencyProfile
 *   GET /api/CountryDependency/global-report  → CountryDependencyGlobalReport
 */

/** A commodity entry inside a country dependency profile */
export interface CountryTopCommodity {
  commodityId:     number;
  commodityName:   string;
  category:        string;
  dependencyScore: number;
  substitutionRisk: string;   // "Very Low" | "Low" | "Medium" | "High" | "Unknown"
  companyCount:    number;
}

/** Full dependency profile for a single country */
export interface CountryDependencyProfile {
  countryId:                number;
  countryName:              string;
  bloc:                     string;
  currency:                 string;
  strategicValueScore:      number;
  strategicTier:            string;   // "Critical" | "High" | "Medium" | "Low"
  totalCommodities:         number;
  totalCompanyConnections:  number;
  avgDependencyScore:       number;
  avgSubstitutionRisk:      number;
  avgSustainabilityScore:   number;
  marketConcentrationRisk:  number;
  categories:               string[];
  topCommodities:           CountryTopCommodity[];
  topDependentCompanies:    string[];
}

/** Global report — all countries ranked by strategic value */
export interface CountryDependencyGlobalReport {
  generatedAt:     string;
  totalCountries:  number;
  rankedCountries: CountryDependencyProfile[];
}
