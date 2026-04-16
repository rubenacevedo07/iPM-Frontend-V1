/**
 * companyCommodityService.ts  —  services/companyCommodityService.ts
 *
 * API service for the CompanyCommodities endpoint.
 * Endpoint: GET /api/CompanyCommodities/company/{companyId}
 * Returns:  CompanyCommodity[]
 */

import { API_COMPANIES } from "../config/apiConfig";
import type { CompanyCommodity } from "../types/companyCommodity";

export const companyCommodityService = {
  getByCompanyId: async (companyId: number): Promise<CompanyCommodity[]> => {
    const response = await fetch(`${API_COMPANIES}/CompanyCommodities/company/${companyId}`);

    if (!response.ok) {
      throw new Error(
        `Error fetching commodities for company ${companyId}: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  },

  getByCommodityId: async (commodityId: number): Promise<CompanyCommodity[]> => {
    const response = await fetch(`${API_COMPANIES}/CompanyCommodities/commodity/${commodityId}`);

    if (response.status === 404) return [];   // no records → treat as empty list

    if (!response.ok) {
      throw new Error(
        `Error fetching companies for commodity ${commodityId}: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  },
};
