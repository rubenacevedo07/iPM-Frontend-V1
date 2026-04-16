/**
 * companyProvider.ts  —  types/companyProvider.ts
 *
 * TypeScript interfaces for the CompanyProviders API.
 * Endpoint: GET /api/CompanyProviders/company/{companyId}
 */

export interface CompanyProvider {
  id:            number;
  companyId:     number;
  serviceType:   string;
  providerId:    number;
  contractValue: number;
  description:   string;
  category:      string;

  provider: {
    id:           number;
    name:         string;
    category:     string;
    country:      string;
    founders:     string[];
    ceo:          string;
    marketCapUsd: number;
    revenueUsd:   number | null;
    netIncomeUsd: number | null;
    equityUsd:    number | null;
    lastUpdated:  string;
    logo:         string;
    headquarters: string;
    latitude:     number;
    longitude:    number;
  };
}
