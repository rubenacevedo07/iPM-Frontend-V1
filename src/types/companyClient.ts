/**
 * companyClient.ts  —  types/companyClient.ts
 *
 * TypeScript interfaces for the CompanyClients API.
 * Endpoint: GET /api/CompanyClients/{companyId}
 *
 * Both `company` (supplier) and `client` (buyer) share the same shape,
 * defined once as a nested type inside CompanyClient so there is no
 * separate export to import or forget.
 *
 * Usage:
 *   import type { CompanyClient } from '../types/companyClient';
 *
 *   const supplier: CompanyClient['company'] = record.company;
 *   const client:   CompanyClient['client']  = record.client;
 */

export interface CompanyClient {
  id:            number;
  contractValue: number;   // USD, e.g. 12_000_000_000
  description:   string;
  clientId:      number;
  companyId:     number;

  /** The supplier — the company we queried by id */
  company: {
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
    lastUpdated:  string;       // ISO-8601
    logo:         string;       // filename, e.g. "nvidia.jpeg"
    headquarters: string;
    latitude:     number;
    longitude:    number;
  };

  /** The buyer / client */
  client: {
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
