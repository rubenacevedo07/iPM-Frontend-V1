/**
 * companyClientSimpleService.ts  —  services/companyClientSimpleService.ts
 *
 * API service for the simplified CompanyClients endpoint.
 *
 * Endpoint:  GET /api/CompanyClients/company/{companyId}
 * Returns:   CompanyClientSimple[]
 *
 * Note: this endpoint returns lightweight contract records (company / client
 * nested objects are null). For full nested company data use
 * companyClientService.getByCompanyId() which hits /api/CompanyClients/{id}.
 */

import { API_CLIENTS } from "../config/apiConfig";
import type { CompanyClientSimple } from "../types/companyClientSimple";

export const companyClientSimpleService = {
  /**
   * Fetches all client contracts where the given company is the supplier.
   * @param companyId  Numeric company id, e.g. 1 for NVIDIA.
   */
  getByCompanyId: async (companyId: number): Promise<CompanyClientSimple[]> => {
    const response = await fetch(`${API_CLIENTS}/CompanyClients/company/${companyId}`);

    if (!response.ok) {
      throw new Error(
        `Error fetching clients for company ${companyId}: ${response.statusText}`
      );
    }

    return response.json();
  },
};
