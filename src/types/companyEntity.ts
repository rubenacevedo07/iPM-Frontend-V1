/**
 * companyEntity.ts
 * Unified Company entity type for the CompanyEntityPage.
 */

export interface CompanyProduct {
  productName: string;
  sku: string;
  productDescription: string;
}

export interface CompanyFabric {
  name: string;
  city: string;
  country: string;
  employees: number;
  description: string;
}

export interface CompanyMarket {
  countryContinent: string;
  description: string;
}

export interface CompanyClientSimple {
  clientName: string;
  contractValue: number;
  description: string;
}

export interface CompanyProvider {
  serviceType: string;
  category: string;
  contractValue: number;
  description: string;
  provider: CompanyEntity;
}

export interface CompanyCommodity {
  commodityName: string;
  dependencyLevel: "Critical" | "High" | "Medium" | "Low";
  exposurePercentage: number;
  contractType: string;
  notes: string;
}

export interface RiskProfile {
  overallRiskScore: number;
  riskTier: string;
  concentrationRisk: number;
  criticalDependencies: number;
  highDependencies: number;
  avgSustainabilityScore: number;
  commodityBreakdown: CompanyCommodity[];
}

export interface AssetManagerFull {
  assetManager: { name: string; logo: string };
  ownershipPercentage: number;
  isMajorHolder: boolean;
}

export interface CompanyEntity {
  id: number;
  name: string;
  category: string;
  country: string;
  headquarters: string;
  ceo: string;
  founders: string[];
  marketCapUsd: number;
  revenueUsd: number;
  netIncomeUsd: number;
  equityUsd: number;
  employees: number;
  latitude: number;
  longitude: number;
  products: CompanyProduct[];
  facilities: CompanyFabric[];
  markets: CompanyMarket[];
  clients: CompanyClientSimple[];
  providers: CompanyProvider[];
  commodities: CompanyCommodity[];
  riskProfile: RiskProfile;
  oci: number;
  shareholders: AssetManagerFull[];
}
