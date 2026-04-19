/**
 * CompanyFundamentalsDto — company overview from Alpha Vantage (cached 168hr by backend).
 * Endpoint: GET /api/AlphaVantage/overview/{symbol}
 * Shape verified via curl 2026-04-19 against NVDA.
 *
 * Notes:
 * - Backend serializes MA50/MA200 as `mA50`/`mA200` (System.Text.Json
 *   default camelCase on leading-caps abbreviations). Preserved exactly.
 * - `company` is omitted (backend returns `null` due to circular-ref protection).
 * - All fundamentals fields nullable — Alpha Vantage may return missing data
 *   for private companies, non-US exchanges, rate-limited responses, etc.
 */
export interface CompanyFundamentalsDto {
  id:                          number;
  companyId:                   number;
  symbol:                      string;
  name:                        string | null;
  assetType:                   string | null;
  exchange:                    string | null;
  currency:                    string | null;
  sector:                      string | null;
  industry:                    string | null;
  country:                     string | null;

  // ── Valuation ─────────────────────────────────────────────────────
  marketCapitalization:        number | null;
  ebitda:                      number | null;
  peRatio:                     number | null;
  pegRatio:                    number | null;
  bookValue:                   number | null;
  trailingPE:                  number | null;
  forwardPE:                   number | null;
  priceToSalesRatioTTM:        number | null;
  priceToBookRatio:            number | null;
  evToRevenue:                 number | null;
  evToEBITDA:                  number | null;

  // ── Dividends ─────────────────────────────────────────────────────
  dividendPerShare:            number | null;
  dividendYield:               number | null;
  dividendDate:                string | null;
  exDividendDate:              string | null;

  // ── Earnings + margins ────────────────────────────────────────────
  eps:                         number | null;
  dilutedEPSTTM:               number | null;
  revenuePerShareTTM:          number | null;
  profitMargin:                number | null;
  operatingMarginTTM:          number | null;
  returnOnAssetsTTM:           number | null;
  returnOnEquityTTM:           number | null;
  revenueTTM:                  number | null;
  grossProfitTTM:              number | null;
  quarterlyEarningsGrowthYOY:  number | null;
  quarterlyRevenueGrowthYOY:   number | null;

  // ── Price metrics ─────────────────────────────────────────────────
  beta:                        number | null;
  week52High:                  number | null;
  week52Low:                   number | null;
  mA50:                        number | null;   // backend: MA50 → mA50 (camelCase quirk)
  mA200:                       number | null;   // backend: MA200 → mA200

  // ── Analyst ratings ───────────────────────────────────────────────
  analystTargetPrice:          number | null;
  analystRatingStrongBuy:      number | null;
  analystRatingBuy:            number | null;
  analystRatingHold:           number | null;
  analystRatingSell:           number | null;
  analystRatingStrongSell:     number | null;

  // ── Shares ────────────────────────────────────────────────────────
  sharesOutstanding:           number | null;

  // ── Dates ─────────────────────────────────────────────────────────
  fiscalYearEnd:               string | null;
  latestQuarter:               string | null;   // YYYY-MM-DD
  fetchedAt:                   string;          // ISO datetime
}
