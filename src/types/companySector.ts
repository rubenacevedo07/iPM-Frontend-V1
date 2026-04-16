/**
 * companySector.ts  —  types/companySector.ts
 *
 * TypeScript interface for the CompanySectors API.
 * Endpoint: GET /api/CompanySectors/company/{companyId}
 */

export interface CompanySector {
  companyId:  number;
  sectorId:   number;
  sectorName: string;
  isPrimary:  boolean;
}
