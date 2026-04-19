// src/features/company-view/CompanyLeftPanel.tsx
//
// Phase 5.0b.1 Step 11 — orchestrates identity + 3 cards + 1 stub.
//
// Owns its own data fetches (useCompanyById + useCompanyPowerIndex +
// useCompanyTiers + useCompanyRelationEdges). CompanyView also fetches
// some of these at the top level — that's acceptable temporary duplication
// because react-query isn't in use; each useService call is idempotent
// and cheap at this scale. Consolidation into a single shared context is
// deferred to 5.0c.

import { useCompanyById } from '@/hooks/useCompanyData'
import { useCompanyPowerIndex } from '@/hooks/useCompanyPowerIndex'
import { useCompanyTiers } from '@/hooks/useCompanyTiers'
import { useCompanyRelationEdges } from '@/hooks/useCompanyRelationEdges'
import { useCompanyQuote } from '@/hooks/useCompanyQuote'
import { useCompanyFundamentals } from '@/hooks/useCompanyFundamentals'

import { CompanyPowerSignalsCard } from './cards/CompanyPowerSignalsCard'
import { CompanyKeyPeopleCard } from './cards/CompanyKeyPeopleCard'
import { CompanySignalsCard } from './cards/CompanySignalsCard'
import { formatMarketCap } from './shared'

import styles from './scss/CompanyLeftPanel.module.scss'

interface Props {
  companyId: number
  nodeId:    string  // e.g. "company:1"
}

export function CompanyLeftPanel({ companyId, nodeId }: Props) {
  const { data: company }    = useCompanyById(companyId)
  const { data: powerIndex } = useCompanyPowerIndex(companyId)
  const { data: tiers }      = useCompanyTiers(companyId)
  const { data: edges }      = useCompanyRelationEdges('Company', companyId)

  // Live market data — only fetched when ticker exists
  const { data: quote }        = useCompanyQuote(company?.ticker)
  const { data: fundamentals } = useCompanyFundamentals(company?.ticker)

  // Market cap: prefer live fundamentals, fallback to static company.marketCapUsd
  const displayMarketCap =
    fundamentals?.marketCapitalization ?? company?.marketCapUsd ?? null
  const marketCapIsLive = fundamentals?.marketCapitalization != null

  return (
    <aside className={styles.leftPanel}>
      {/* ── Identity ────────────────────────────────────────────── */}
      <div className={styles.identity}>
        {company?.logo && (
          <img
            src={`/companies/${company.logo}`}
            alt={company.name}
            className={styles.logo}
          />
        )}
        <h1 className={styles.companyName}>{company?.name ?? 'Loading…'}</h1>
        <div className={styles.tickerRow}>
          {company?.ticker && <span className={styles.ticker}>{company.ticker}</span>}
          {quote && (
            <span className={quote.change >= 0 ? styles.pricePillUp : styles.pricePillDown}>
              ${quote.price.toFixed(2)}{' '}
              <span className={styles.priceChange}>
                {quote.change >= 0 ? '▲' : '▼'}
                {Math.abs(quote.changePercent).toFixed(2)}%
              </span>
            </span>
          )}
        </div>
        <div className={styles.metaRow}>
          {displayMarketCap !== null && (
            <div className={styles.meta}>
              {formatMarketCap(displayMarketCap)}
              {marketCapIsLive && (
                <span
                  className={styles.liveIndicator}
                  title="Live from Alpha Vantage"
                >
                  {' '}●
                </span>
              )}
            </div>
          )}
          {company?.employees && (
            <div className={styles.meta}>{company.employees.toLocaleString('en-US')} employees</div>
          )}
          {company?.headquarters && (
            <div className={styles.meta}>{company.headquarters}</div>
          )}
        </div>
      </div>

      <hr className={styles.divider} />

      <CompanyPowerSignalsCard powerIndex={powerIndex} tiers={tiers} />

      <hr className={styles.divider} />

      <CompanyKeyPeopleCard edges={edges} companyId={companyId} />

      <hr className={styles.divider} />

      {/* Ownership stub per Decision G (wired in Phase 5.0b.2) */}
      <div className={styles.ownershipStub}>
        <div className={styles.stubTitle}>OWNERSHIP</div>
        <p className={styles.stubText}>Ownership data — Phase 5.0b.2</p>
      </div>

      <hr className={styles.divider} />

      <CompanySignalsCard nodeId={nodeId} />
    </aside>
  )
}
