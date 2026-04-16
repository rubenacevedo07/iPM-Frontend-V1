/**
 * companyClientService.ts
 *
 * API service for the CompanyClients endpoint.
 * Mirrors the pattern from companyService.ts.
 *
 * Endpoint:  GET /api/CompanyClients/{companyId}
 * Returns:   CompanyClient[]  — all client relationships for the given company.
 */

import { API_CLIENTS } from "../config/apiConfig";
import type { CompanyClient } from "../types/companyClient";

const API_BASE = `${API_CLIENTS}/CompanyClients`;

export const companyClientService = {
  /**
   * Fetches all client contracts where `companyId` is the supplier.
   * @param companyId  The numeric id of the selected company (e.g. 1 for NVIDIA).
   */
  getByCompanyId: async (companyId: number): Promise<CompanyClient[]> => {
    const response = await fetch(`${API_BASE}/company/${companyId}`);

    if (!response.ok) {
      throw new Error(
        `Error fetching company clients for id ${companyId}: ${response.statusText}`
      );
    }

    return response.json();
  },
};
