// src/features/company-view/tabs/OverviewTab.tsx
//
// Phase 5.0b.1 Step 12 — 2×2 quadrant grid (Clients / Suppliers /
// Competition / Governance) + KEY METRICS kv grid below.

import type { ReactNode } from 'react'
import type { Company } from '@/hooks/useCompanyData'
import type { CategorizedEdges } from '../shared'
import type { MarketQuoteDto } from '@/types/marketQuote'
import type { CompanyFundamentalsDto } from '@/types/companyFundamentals'
import { sortByStrength, strengthColor, formatMarketCap } from '../shared'
import styles from '../scss/OverviewTab.module.scss'

interface Props {
  company:       Company | null
  categorized:   CategorizedEdges
  quote:         MarketQuoteDto | null
  fundamentals:  CompanyFundamentalsDto | null
}

function KV({
  label,
  value,
  extra,
}: {
  label: string
  value: string
  extra?: ReactNode
}) {
  return (
    <div className={styles.kv}>
      <div className={styles.kvLabel}>{label}</div>
      <div className={styles.kvValue}>
        {value}
        {extra && <span className={styles.kvExtra}> {extra}</span>}
      </div>
    </div>
  )
}

export function OverviewTab({ company, categorized, quote, fundamentals }: Props) {
  const topClients    = sortByStrength(categorized.clients).slice(0, 5)
  const topSuppliers  = sortByStrength(categorized.suppliers).slice(0, 5)
  const competitors   = categorized.competitors.slice(0, 5)
  const topGovernance = categorized.governance.slice(0, 3)

  const companyIdForCompetition = company?.id ?? -1

  return (
    <div className={styles.container}>
      <div className={styles.quadGrid}>
        {/* Q1: TOP CLIENTS */}
        <section className={styles.quad}>
          <h3 className={styles.quadTitle}>TOP CLIENTS</h3>
          {topClients.length === 0 ? (
            <div className={styles.empty}>No clients recorded.</div>
          ) : (
            topClients.map(edge => (
              <div key={edge.id} className={styles.row}>
                <span className={styles.name}>{edge.targetName ?? '—'}</span>
                {edge.targetTicker && <span className={styles.ticker}>{edge.targetTicker}</span>}
                <span
                  className={styles.badge}
                  style={{ backgroundColor: strengthColor(edge.strength) }}
                >
                  {edge.strength}
                </span>
              </div>
            ))
          )}
        </section>

        {/* Q2: KEY SUPPLIERS */}
        <section className={styles.quad}>
          <h3 className={styles.quadTitle}>KEY SUPPLIERS</h3>
          {topSuppliers.length === 0 ? (
            <div className={styles.empty}>No suppliers recorded.</div>
          ) : (
            topSuppliers.map(edge => (
              <div key={edge.id} className={styles.row}>
                <span className={styles.name}>{edge.targetName ?? '—'}</span>
                {edge.targetTicker && <span className={styles.ticker}>{edge.targetTicker}</span>}
                <span
                  className={styles.badge}
                  style={{ backgroundColor: strengthColor(edge.strength) }}
                >
                  {edge.strength}
                </span>
              </div>
            ))
          )}
        </section>

        {/* Q3: COMPETITION */}
        <section className={styles.quad}>
          <h3 className={styles.quadTitle}>COMPETITION</h3>
          {competitors.length === 0 ? (
            <div className={styles.empty}>No competitors recorded.</div>
          ) : (
            competitors.map(edge => {
              // Edge is bidirectional; show the OTHER side
              const isSelfSource = edge.sourceId === companyIdForCompetition
              const otherName   = isSelfSource ? edge.targetName   : edge.sourceName
              const otherTicker = isSelfSource ? edge.targetTicker : edge.sourceTicker
              return (
                <div key={edge.id} className={styles.row}>
                  <span className={styles.name}>{otherName ?? '—'}</span>
                  {otherTicker && <span className={styles.ticker}>{otherTicker}</span>}
                </div>
              )
            })
          )}
        </section>

        {/* Q4: GOVERNANCE */}
        <section className={styles.quad}>
          <h3 className={styles.quadTitle}>GOVERNANCE</h3>
          {topGovernance.length === 0 ? (
            <div className={styles.empty}>No governance edges.</div>
          ) : (
            topGovernance.map(edge => (
              <div key={edge.id} className={styles.row}>
                <span className={styles.name}>{edge.sourceName ?? '—'}</span>
                {edge.label && <span className={styles.subtle}>{edge.label}</span>}
              </div>
            ))
          )}
        </section>
      </div>

      {/* KEY METRICS */}
      <section className={styles.metrics}>
        <h3 className={styles.metricsTitle}>KEY METRICS</h3>
        <div className={styles.kvGrid}>
          <KV label="Market Cap"   value={formatMarketCap(company?.marketCapUsd)} />
          <KV label="Employees"    value={company?.employees?.toLocaleString('en-US') ?? '—'} />
          <KV label="Founded"      value={company?.founded?.toString() ?? '—'} />
          <KV label="Headquarters" value={company?.headquarters ?? '—'} />
          <KV label="CEO"          value={company?.ceo ?? '—'} />
          <KV label="Country"      value={company?.country ?? '—'} />
        </div>
      </section>

      {/* FUNDAMENTALS — only renders when live market data is available */}
      {(quote || fundamentals) && (
        <section className={styles.fundamentals}>
          <h3 className={styles.metricsTitle}>FUNDAMENTALS</h3>
          <div className={styles.kvGrid}>
            {quote && (
              <KV
                label="Price"
                value={`$${quote.price.toFixed(2)}`}
                extra={
                  <span className={quote.change >= 0 ? styles.kvUp : styles.kvDown}>
                    {quote.change >= 0 ? '▲' : '▼'}
                    {Math.abs(quote.changePercent).toFixed(2)}%
                  </span>
                }
              />
            )}
            {fundamentals?.marketCapitalization != null && (
              <KV
                label="Market Cap"
                value={formatMarketCap(fundamentals.marketCapitalization)}
              />
            )}
            {fundamentals?.peRatio != null && (
              <KV label="PE Ratio" value={fundamentals.peRatio.toFixed(2)} />
            )}
            {fundamentals?.eps != null && (
              <KV label="EPS" value={`$${fundamentals.eps.toFixed(2)}`} />
            )}
            {fundamentals?.week52Low != null && fundamentals?.week52High != null && (
              <KV
                label="52W Range"
                value={`$${fundamentals.week52Low.toFixed(2)} – $${fundamentals.week52High.toFixed(2)}`}
              />
            )}
            {fundamentals?.analystTargetPrice != null && quote?.price != null && (
              <KV
                label="Analyst Target"
                value={`$${fundamentals.analystTargetPrice.toFixed(2)}`}
                extra={
                  <span
                    className={
                      fundamentals.analystTargetPrice > quote.price
                        ? styles.kvUp
                        : styles.kvDown
                    }
                  >
                    {((fundamentals.analystTargetPrice / quote.price - 1) * 100).toFixed(1)}%
                  </span>
                }
              />
            )}
            {fundamentals?.beta != null && (
              <KV label="Beta" value={fundamentals.beta.toFixed(2)} />
            )}
          </div>
          <div className={styles.fundamentalsFooter}>
            {quote && <span>Last trade: {quote.latestTradingDay}</span>}
            {fundamentals && (
              <span>
                {quote ? ' · ' : ''}Fundamentals as of{' '}
                {new Date(fundamentals.fetchedAt).toLocaleDateString('en-US')}
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
