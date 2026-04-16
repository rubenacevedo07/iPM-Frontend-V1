/**
 * countryTrade.ts  —  types/countryTrade.ts
 *
 * TypeScript interfaces for the CountryTrades API.
 * Endpoint: GET /api/CountryTrades
 */

export interface CountryTrade {
  id:                  number;
  countryId:           number;
  partnerId:           number;
  tradeType:           string;   // "Export" | "Import"
  commodityCategoryId: number;
  commodity:           string;
  amount:              number;   // value in USD (thousands / millions depending on API)
  year:                number;

  commodityCategory: null | {
    id:   number;
    name: string;
  };

  country: null | {
    id:       number;
    name:     string;
    bloc:     string;
    currency: string;
  };

  partner: null | {
    id:       number;
    name:     string;
    bloc:     string;
    currency: string;
  };
}
