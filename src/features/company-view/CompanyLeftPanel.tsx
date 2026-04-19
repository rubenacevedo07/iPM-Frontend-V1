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

import { CompanyPowerSignalsCard } from './cards/CompanyPowerSignalsCard'
import { CompanyKeyPeopleCard } from './cards/CompanyKeyPeopleCard'
import { CompanySignalsCard } from './cards/CompanySignalsCard'

import styles from './scss/CompanyLeftPanel.module.scss'

interface Props {
  companyId: number
  nodeId:    string  // e.g. "company:1"
}

function formatMarketCap(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return '—'
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(2)}T`
  if (usd >= 1e9)  return `$${(usd / 1e9).toFixed(1)}B`
  if (usd >= 1e6)  return `$${(usd / 1e6).toFixed(1)}M`
  return `$${usd.toLocaleString('en-US')}`
}

export function CompanyLeftPanel({ companyId, nodeId }: Props) {
  const { data: company }    = useCompanyById(companyId)
  const { data: powerIndex } = useCompanyPowerIndex(companyId)
  const { data: tiers }      = useCompanyTiers(companyId)
  const { data: edges }      = useCompanyRelationEdges('Company', companyId)

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
          {/* Price pill slot — Track C Fase C2 integration point */}
        </div>
        <div className={styles.metaRow}>
          {company?.marketCapUsd !== undefined && company?.marketCapUsd !== null && (
            <div className={styles.meta}>{formatMarketCap(company.marketCapUsd)}</div>
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
