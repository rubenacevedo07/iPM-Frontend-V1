/**
 * companyClientSimple.ts  —  types/companyClientSimple.ts
 *
 * Mirrors the response of:
 *   GET /api/CompanyClients/company/{companyId}
 *
 * Note: this endpoint returns a *simplified* contract record where
 * `company` and `client` are null (only ids and names are present).
 * For the full nested company objects use the CompanyClient type from
 * companyClient.ts (endpoint: /api/CompanyClients/{id}).
 */
export interface CompanyClientSimple {
  id:            number;
  companyId:     number;

  /** Denormalised client name for quick display without a second fetch */
  clientName:    string;

  /** Contract value in USD, e.g. 12_000_000_000 */
  contractValue: number;

  description:   string;

  /** Foreign key — use to fetch the full client company if needed */
  clientId:      number;

  /** Always null in this endpoint */
  company:       null;

  /** Always null in this endpoint */
  client:        null;
}
