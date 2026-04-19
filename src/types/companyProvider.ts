/**
 * companyProvider.ts  —  types/companyProvider.ts
 *
 * TypeScript interfaces for the CompanyProviders API.
 * Endpoint: GET /api/CompanyProviders/company/{companyId}
 *
 * Note: the `provider` nested object is the full Company row with 40+ fields.
 * We explicitly type the subset used by the UI (core identity, market data,
 * signals); everything else falls through the `[key: string]: unknown` index
 * signature so backend additions don't force type updates. Alpha Vantage
 * arrays on the provider (alphaAnnualEarnings, alphaCashFlowQuarterlies,
 * etc.) are intentionally unknown here — consume them via the dedicated
 * Alpha Vantage services instead of drilling through this edge type.
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
    id:                      number;
    name:                    string;
    category:                string;
    country:                 string;
    founders:                string[];
    ceo:                     string;
    marketCapUsd:            number;
    revenueUsd:              number | null;
    netIncomeUsd:            number | null;
    equityUsd:               number | null;
    lastUpdated:             string;
    logo:                    string;
    headquarters:            string;
    latitude:                number;
    longitude:               number;

    // Signals subset added in Phase 5.0b.1 drift resolution (verified via curl 2026-04-19)
    employees:               number;
    ticker:                  string;
    sector:                  string;
    influenceScore:          number;
    systemicImportanceLevel: string;

    // Escape hatch — backend returns 20+ additional fields (alpha vantage
    // arrays, powerMapElements, persons, oilSensitivityScore, etc.) that
    // downstream shouldn't drill through this edge type. Available as
    // unknown for the rare case a caller needs them explicitly.
    [key: string]: unknown;
  };
}
