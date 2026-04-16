/**
 * commodityDependencyService.ts  —  services/commodityDependencyService.ts
 *
 * API service for the CommodityDependency endpoints.
 *
 * Endpoints:
 *   GET /api/CommodityDependency/systemic-risk          → SystemicRiskReport
 *   GET /api/CommodityDependency/companies              → CompanyRiskProfile[]
 *   GET /api/CommodityDependency/companies/{id}         → CompanyRiskProfile
 *   GET /api/CommodityDependency/commodities            → CommodityRiskProfile[]
 *   GET /api/CommodityDependency/commodities/{id}       → CommodityRiskProfile
 */

import { API_COMMODITIES } from "../config/apiConfig";
import type {
  SystemicRiskReport,
  CompanyRiskProfile,
  CommodityRiskProfile,
} from "../types/commodityDependency";

const BASE = `${API_COMMODITIES}/CommodityDependency`;

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CommodityDependency: ${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

export const commodityDependencyService = {
  getSystemicRisk: (): Promise<SystemicRiskReport> =>
    get<SystemicRiskReport>(`${BASE}/systemic-risk`),

  getAllCompanies: (): Promise<CompanyRiskProfile[]> =>
    get<CompanyRiskProfile[]>(`${BASE}/companies`),

  getCompanyById: (companyId: number): Promise<CompanyRiskProfile> =>
    get<CompanyRiskProfile>(`${BASE}/companies/${companyId}`),

  getAllCommodities: (): Promise<CommodityRiskProfile[]> =>
    get<CommodityRiskProfile[]>(`${BASE}/commodities`),

  getCommodityById: (commodityId: number): Promise<CommodityRiskProfile> =>
    get<CommodityRiskProfile>(`${BASE}/commodities/${commodityId}`),
};
