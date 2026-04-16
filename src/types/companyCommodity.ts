/**
 * companyCommodity.ts  —  types/companyCommodity.ts
 *
 * TypeScript interfaces for the CompanyCommodities API.
 * Endpoint: GET /api/CompanyCommodities/company/{companyId}
 *           GET /api/CompanyCommodities/commodity/{commodityId}
 */

/** Nested company object returned inside a CompanyCommodity record */
export interface CompanyInCommodity {
  id:            number;
  name:          string;
  country:       string;
  logo:          string | null;
  latitude?:     number;     // present on the per-commodity endpoint; used for map icon placement
  longitude?:    number;
  headquarters?: string;
}

export interface CompanyCommodity {
  companyId:          number;
  company:            CompanyInCommodity | null;
  commodityId:        number;
  commodityName:      string;
  dependencyLevel:    string;   // "Critical" | "High" | "Medium" | "Low"
  exposurePercentage: number;   // 0–100
  contractType:       string;   // e.g. "Strategic Partnership", "Spot Market"
  notes:              string;
}
