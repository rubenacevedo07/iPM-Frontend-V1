// src/features/company-view/CompanyCenterTabs.tsx
//
// Phase 5.0b.1 Step 16 — 4-tab controller (Overview/Supply Chain/Risk/Analysis).
// Local useState for tab selection — pure UI state, no XState needed.

import { useMemo, useState } from 'react'
import type { Company } from '@/hooks/useCompanyData'
import type { CompanyPowerIndex } from '@/types/companyPowerIndex'
import type { RelationEdgeDto } from '@/types/relationEdge'
import { categorizeEdges } from './shared'
import { OverviewTab } from './tabs/OverviewTab'
import { SupplyChainTab } from './tabs/SupplyChainTab'
import { RiskTab } from './tabs/RiskTab'
import { AnalysisTab } from './tabs/AnalysisTab'
import styles from './scss/CompanyCenterTabs.module.scss'

type TabKey = 'overview' | 'supply-chain' | 'risk' | 'analysis'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview',     label: 'OVERVIEW' },
  { key: 'supply-chain', label: 'SUPPLY CHAIN' },
  { key: 'risk',         label: 'RISK' },
  { key: 'analysis',     label: 'ANALYSIS' },
]

interface Props {
  company:    Company | null
  edges:      RelationEdgeDto[]
  powerIndex: CompanyPowerIndex | null
  companyId:  number
}

export function CompanyCenterTabs({ company, edges, powerIndex, companyId }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const categorized = useMemo(
    () => categorizeEdges(edges, companyId),
    [edges, companyId],
  )

  return (
    <div className={styles.container}>
      <nav className={styles.tabBar} role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={activeTab === tab.key ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <OverviewTab company={company} categorized={categorized} />
        )}
        {activeTab === 'supply-chain' && (
          <SupplyChainTab
            suppliers={categorized.suppliers}
            clients={categorized.clients}
          />
        )}
        {activeTab === 'risk' && (
          <RiskTab company={company} categorized={categorized} edges={edges} />
        )}
        {activeTab === 'analysis' && (
          <AnalysisTab powerIndex={powerIndex} />
        )}
      </div>
    </div>
  )
}
