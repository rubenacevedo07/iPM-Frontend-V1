/**
 * countryEconomy.ts  —  types/countryEconomy.ts
 *
 * TypeScript interfaces for the CountryEconomies API.
 * Endpoint: GET /api/CountryEconomies
 */

export interface CountryEconomy {
  id:                 number;
  countryId:          number;
  gdp:                number;
  gdpgrowth:          number;
  unemploymentRate:   number;
  inflationRate:      number;
  economicBalance:    number;
  debtToFedReserve:   number;
  totalSovereignDebt: number;
  debtToGdpratio:     number;
  foreignBondHoldings: string;  // JSON string — parse with JSON.parse()
  creditRating:       string;
  timestamp:          string;
  country:            null | {
    id:        number;
    name:      string;
    president: string;
    bloc:      string;
    habitants: number;
    currency:  string;
  };
}
