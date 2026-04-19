// src/features/company-view/CompanyView.tsx
//
// Phase 5.0b.1 Step 17 + Track C Fase C2.
// Fetches company + powerIndex + edges + quote + fundamentals. 3 gates
// (loading/error/null) then LeftPanel (320px fixed) + CenterTabs (flex 1).
//
// Owns the Alpha Vantage hooks (quote/fundamentals) so LeftPanel and
// OverviewTab receive them as props — single fetch per page render.

import { useCompanyById } from '@/hooks/useCompanyData'
import { useCompanyPowerIndex } from '@/hooks/useCompanyPowerIndex'
import { useCompanyRelationEdges } from '@/hooks/useCompanyRelationEdges'
import { useCompanyQuote } from '@/hooks/useCompanyQuote'
import { useCompanyFundamentals } from '@/hooks/useCompanyFundamentals'
import { CompanyLeftPanel } from './CompanyLeftPanel'
import { CompanyCenterTabs } from './CompanyCenterTabs'
import styles from './scss/CompanyView.module.scss'

interface Props {
  companyId: number
  nodeId:    string  // e.g. "company:1"
}

export default function CompanyView({ companyId, nodeId }: Props) {
  const { data: company,    loading: cLoading,  error: cError }  = useCompanyById(companyId)
  const { data: powerIndex, loading: piLoading, error: piError } = useCompanyPowerIndex(companyId)
  const { data: edges }                                          = useCompanyRelationEdges('Company', companyId)

  // Live market data — owned here so LeftPanel + OverviewTab share a single fetch.
  // Hooks return null data when ticker is null/undefined (graceful for private entities).
  const { data: quote }        = useCompanyQuote(company?.ticker)
  const { data: fundamentals } = useCompanyFundamentals(company?.ticker)

  // Loading gate — only on the two most critical data sources
  if (piLoading || cLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading company intelligence…</div>
      </div>
    )
  }

  // Error gate
  if (piError || cError) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBlock}>
          <h2 className={styles.errorTitle}>Error loading company {companyId}</h2>
          <pre className={styles.errorDetail}>{piError ?? cError}</pre>
        </div>
      </div>
    )
  }

  // Null gate — entity actually missing
  if (!company || !powerIndex) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBlock}>
          <h2 className={styles.errorTitle}>Entity not found: company {companyId}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <CompanyLeftPanel
        companyId={companyId}
        nodeId={nodeId}
        quote={quote}
        fundamentals={fundamentals}
      />
      <main className={styles.center}>
        <CompanyCenterTabs
          company={company}
          edges={edges ?? []}
          powerIndex={powerIndex}
          companyId={companyId}
          quote={quote}
          fundamentals={fundamentals}
        />
      </main>
    </div>
  )
}
