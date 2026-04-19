/**
 * MarketQuoteDto — live price snapshot from Alpha Vantage (cached 60min by backend).
 * Endpoint: GET /api/AlphaVantage/quote/{symbol}
 * Shape verified via curl 2026-04-19 against NVDA.
 *
 * `company` is omitted (backend returns `null` due to circular-ref protection).
 */
export interface MarketQuoteDto {
  id:                number;
  companyId:         number;
  symbol:            string;
  price:             number;
  change:            number;
  changePercent:     number;
  volume:            number;
  high:              number;
  low:               number;
  open:              number;
  previousClose:     number;
  latestTradingDay:  string;   // YYYY-MM-DD
  fetchedAt:         string;   // ISO datetime
}
