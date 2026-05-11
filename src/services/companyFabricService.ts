/**
 * companyFabricService.ts  —  services/companyFabricService.ts
 *
 * API service for the CompanyFabrics endpoint.
 *
 * Endpoint:  GET /api/CompanyFabrics/company/{companyId}
 * Returns:   CompanyFabric[]
 */

import { API_FABRICS } from "../config/apiConfig";
import type { CompanyFabric } from "../types/companyFabric";

export const companyFabricService = {
  /**
   * Fetches all physical sites / facilities for the given company.
   * @param companyId  Numeric company id, e.g. 1 for NVIDIA.
   */
  getByCompanyId: async (companyId: number): Promise<CompanyFabric[]> => {
    try {
      const response = await fetch(`${API_FABRICS}/CompanyFabrics/company/${companyId}`);
      if (!response.ok) throw new Error(`${response.status}`);
      return response.json();
    } catch {
      const res = await fetch('/companyfabrics.json');
      return res.json();
    }
  },
};
