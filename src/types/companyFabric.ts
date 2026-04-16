/**
 * companyFabric.ts  —  types/companyFabric.ts
 *
 * Mirrors the response of:
 *   GET /api/CompanyFabrics/company/{companyId}
 *
 * "Fabric" represents a physical operational site (factory, office, lab, etc.)
 */
export interface CompanyFabric {
  id:          number;
  name:        string;
  country:     string;
  city:        string;

  /** Headcount at this site */
  employees:   number;

  description: string;
  companyId:   number;
}
