// src/features/company-view/tabs/OverviewTab.tsx
//
// Phase 5.0b.1 Step 12 — 2×2 quadrant grid (Clients / Suppliers /
// Competition / Governance) + KEY METRICS kv grid below.

import type { Company } from '@/hooks/useCompanyData'
import type { CategorizedEdges } from '../shared'
import { sortByStrength, strengthColor } from '../shared'
import styles from '../scss/OverviewTab.module.scss'

interface Props {
  company:     Company | null
  categorized: CategorizedEdges
}

function formatMarketCap(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return '—'
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(2)}T`
  if (usd >= 1e9)  return `$${(usd / 1e9).toFixed(1)}B`
  if (usd >= 1e6)  return `$${(usd / 1e6).toFixed(1)}M`
  return `$${usd.toLocaleString('en-US')}`
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.kv}>
      <div className={styles.kvLabel}>{label}</div>
      <div className={styles.kvValue}>{value}</div>
    </div>
  )
}

export function OverviewTab({ company, categorized }: Props) {
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
    </div>
  )
}
