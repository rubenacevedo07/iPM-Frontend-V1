/**
 * country.ts  —  types/country.ts
 *
 * TypeScript interfaces for the Countries API.
 * Endpoint: GET /api/Countries
 */

export interface Country {
  id:          number;
  name:        string;
  president:   string;
  bloc:        string;
  habitants:   number;
  currency:    string;
  lastUpdated: string;

  centralBankReserves:       any[];
  countryEconomies:          any[];
  countryRelationCountries:  any[];
  countryRelationTargets:    any[];
  countryTechnologies:       any[];
  countryTradeCountries:     any[];
  countryTradePartners:      any[];
  sovereignWealthFunds:      any[];
}
