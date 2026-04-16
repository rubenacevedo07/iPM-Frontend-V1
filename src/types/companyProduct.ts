/**
 * companyProduct.ts  —  types/companyProduct.ts
 *
 * Mirrors the response of:
 *   GET /api/CompanyProducts/company/{companyId}
 */
export interface CompanyProduct {
  id:                 number;
  companyId:          number;
  productName:        string;

  /** Stock-keeping unit identifier, e.g. "NV-GPU-B200" */
  sku:                string;

  /** Optional long-form description — API may return null */
  productDescription: string | null;
}
