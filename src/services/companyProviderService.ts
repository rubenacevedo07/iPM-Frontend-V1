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
    try {
      const response = await fetch(`${API_PROVIDERS}/CompanyProviders/company/${companyId}`);
      if (!response.ok) throw new Error(`${response.status}`);
      return response.json();
    } catch {
      const res = await fetch('/companyproviders.json');
      return res.json();
    }
  },
};
