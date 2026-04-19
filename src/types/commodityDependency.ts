/**
 * commodityDependency.ts  —  types/commodityDependency.ts
 *
 * TypeScript interfaces for the CommodityDependency API.
 * Base: GET /api/CommodityDependency/...
 *
 * Literal unions for the enum-like string fields match backend
 * RiskTier.cs / SubstitutionRisk.cs / DependencyLevel.cs. Narrowed in Phase
 * 5.0b.1 drift resolution (2026-04-19) for compile-time exhaustiveness.
 * If backend adds a new value, add it here explicitly.
 */

export type RiskTier         = 'Critical' | 'High' | 'Medium' | 'Low';
export type DependencyLevel  = 'Critical' | 'High' | 'Medium' | 'Low';
export type SubstitutionRisk = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';

/** A company's exposure record as it appears inside a commodity risk profile */
export interface TopExposedCompany {
  companyId:         number;
  companyName:       string;
  dependencyLevel:   DependencyLevel;
  exposurePercentage: number;
  contractType:      string;
  substitutionRisk:  SubstitutionRisk;
}

/** A commodity's exposure record as it appears inside a company risk profile */
export interface CommodityBreakdownItem {
  commodityId:        number;
  commodityName:      string;
  category:           string;
  dependencyLevel:    DependencyLevel;
  exposurePercentage: number;
  substitutionRisk:   SubstitutionRisk;
  riskContribution:   number;
}

/** Full risk profile for a single commodity  (/commodities and /commodities/{id}) */
export interface CommodityRiskProfile {
  commodityId:               number;
  commodityName:             string;
  category:                  string;
  dependencyScore:           number;
  riskTier:                  RiskTier;
  companyCount:              number;
  avgExposurePercentage:     number;
  marketConcentrationScore:  number;
  substitutionRiskScore:     number;
  sustainabilityRiskScore:   number;
  topExposedCompanies:       TopExposedCompany[];
}

/** Full risk profile for a single company  (/companies and /companies/{id}) */
export interface CompanyRiskProfile {
  companyId:              number;
  companyName:            string;
  overallRiskScore:       number;
  riskTier:               RiskTier;
  criticalDependencies:   number;
  highDependencies:       number;
  avgSustainabilityScore: number;
  concentrationRisk:      number;
  commodityBreakdown:     CommodityBreakdownItem[];
}

/** Systemic-risk report  (/systemic-risk) */
export interface SystemicRiskReport {
  generatedAt:               string;
  totalCommodities:          number;
  totalCompanies:            number;
  avgSystemDependencyScore:  number;
  criticalCommodities:       CommodityRiskProfile[];
  mostExposedCompanies:      CompanyRiskProfile[];
}
