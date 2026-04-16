/**
 * companyProviderService.ts  —  services/companyProviderService.ts
 *
 * API service for the CompanyProviders endpoint.
 * Endpoint: GET /api/CompanyProviders/company/{companyId}
 * Returns:  CompanyProvider[]
 */

import { API_PROVIDERS } from '@/config/apiConfig'
import type { CompanyProvider } from '@/types/companyProvider'

export const companyProviderService = {
  getByCompanyId: async (companyId: number): Promise<CompanyProvider[]> => {
    const response = await fetch(`${API_PROVIDERS}/CompanyProviders/company/${companyId}`);

    if (!response.ok) {
      throw new Error(
        `Error fetching providers for company ${companyId}: ${response.statusText}`
      );
    }

    return response.json();
  },
};
