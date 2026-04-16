/**
 * companyMarket.ts  —  types/companyMarket.ts
 *
 * Mirrors the response of:
 *   GET /api/CompanyMarkets/company/{companyId}
 */
export interface CompanyMarket {
  id:               number;
  companyId:        number;

  /** Geographic region / continent, e.g. "North America", "Asia" */
  countryContinent: string;

  /** Human-readable description of the market opportunity */
  description:      string;

  /** Nullable — API returns null for nested company in this endpoint */
  company:          null;
}
