/**
 * assetManagerCompanyService.ts  —  services/assetManagerCompanyService.ts
 *
 * Service for the AssetManagerCompany API.
 */

import { API_ASSET_MANAGERS } from "../config/apiConfig";
import type {
  ManagerCompany,
  AssetManagerCompanyDetailed,
  CompanyOci,
  AssetManagerCompanyFull,
} from "../types/assetManagerCompany";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json() as Promise<T>;
}

export const assetManagerCompanyService = {
  /** GET /api/AssetManagerCompany/company/{id}/detailed */
  getDetailed(companyId: number): Promise<AssetManagerCompanyDetailed[]> {
    return get<AssetManagerCompanyDetailed[]>(
      `${API_ASSET_MANAGERS}/AssetManagerCompany/company/${companyId}/detailed`
    );
  },

  /** GET /api/AssetManagerCompany/company/{id}/oci */
  getOci(companyId: number): Promise<CompanyOci> {
    return get<CompanyOci>(
      `${API_ASSET_MANAGERS}/AssetManagerCompany/company/${companyId}/oci`
    );
  },

  /** GET /api/AssetManagerCompany/company/{id}/full */
  getFull(companyId: number): Promise<AssetManagerCompanyFull[]> {
    return get<AssetManagerCompanyFull[]>(
      `${API_ASSET_MANAGERS}/AssetManagerCompany/company/${companyId}/full`
    );
  },

  /** GET /api/AssetManagerCompany/manager/{id}/companies */
  getCompaniesByManager(managerId: number): Promise<ManagerCompany[]> {
    return get<ManagerCompany[]>(
      `${API_ASSET_MANAGERS}/AssetManagerCompany/manager/${managerId}/companies`
    );
  },
};
