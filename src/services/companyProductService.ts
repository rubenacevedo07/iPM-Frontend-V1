/**
 * companyProductService.ts  —  services/companyProductService.ts
 *
 * API service for the CompanyProducts endpoint.
 *
 * Endpoint:  GET /api/CompanyProducts/company/{companyId}
 * Returns:   CompanyProduct[]
 */

import { API_PRODUCTS } from "../config/apiConfig";
import type { CompanyProduct } from "../types/companyProduct";

export const companyProductService = {
  /**
   * Fetches all products offered by the given company.
   * @param companyId  Numeric company id, e.g. 1 for NVIDIA.
   */
  getByCompanyId: async (companyId: number): Promise<CompanyProduct[]> => {
    try {
      const response = await fetch(`${API_PRODUCTS}/CompanyProducts/company/${companyId}`);
      if (!response.ok) throw new Error(`${response.status}`);
      return response.json();
    } catch {
      const res = await fetch('/companyproducts.json');
      return res.json();
    }
  },
};
