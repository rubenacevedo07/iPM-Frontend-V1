/**
 * commodityDependency.ts  —  types/commodityDependency.ts
 *
 * TypeScript interfaces for the CommodityDependency API.
 * Base: GET /api/CommodityDependency/...
 */

/** A company's exposure record as it appears inside a commodity risk profile */
export interface TopExposedCompany {
  companyId:         number;
  companyName:       string;
  dependencyLevel:   string;   // "Critical" | "High" | "Medium" | "Low"
  exposurePercentage: number;
  contractType:      string;
  substitutionRisk:  string;   // "Very Low" | "Low" | "Medium" | "High"
}

/** A commodity's exposure record as it appears inside a company risk profile */
export interface CommodityBreakdownItem {
  commodityId:        number;
  commodityName:      string;
  category:           string;
  dependencyLevel:    string;
  exposurePercentage: number;
  substitutionRisk:   string;
  riskContribution:   number;
}

/** Full risk profile for a single commodity  (/commodities and /commodities/{id}) */
export interface CommodityRiskProfile {
  commodityId:               number;
  commodityName:             string;
  category:                  string;
  dependencyScore:           number;
  riskTier:                  string;   // "Critical" | "High" | "Medium" | "Low"
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
  riskTier:               string;
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
