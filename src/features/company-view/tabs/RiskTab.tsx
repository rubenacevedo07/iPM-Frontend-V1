// src/features/company-view/tabs/RiskTab.tsx
//
// Phase 5.0b.1 Step 14 — four risk sections: Geopolitical / Regulatory /
// Sanctions / Concentration. No invented calculations.

import type { Company } from '@/hooks/useCompanyData'
import type { CategorizedEdges } from '../shared'
import type { RelationEdgeDto } from '@/types/relationEdge'
import { sortByStrength, strengthColor } from '../shared'
import styles from '../scss/RiskTab.module.scss'

interface Props {
  company:     Company | null
  categorized: CategorizedEdges
  edges:       RelationEdgeDto[]
}

function systemicLevelColor(level: string): string {
  switch (level) {
    case 'Critical': return '#e53935'
    case 'High':     return '#ff6b35'
    case 'Medium':   return '#f9a825'
    case 'Low':      return '#6b7280'
    default:         return '#6b7280'
  }
}

export function RiskTab({ company, categorized, edges }: Props) {
  const geopolitical = sortByStrength(
    edges.filter(e => e.targetType === 'Country'),
  )

  return (
    <div className={styles.container}>
      {/* ── Geopolitical exposure ─────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>GEOPOLITICAL EXPOSURE</h3>
        {geopolitical.length === 0 ? (
          <div className={styles.empty}>No country-level exposure recorded.</div>
        ) : (
          <ul className={styles.list}>
            {geopolitical.map(edge => (
              <li key={edge.id} className={styles.row}>
                <span className={styles.country}>{edge.targetName ?? '—'}</span>
                <span
                  className={styles.badge}
                  style={{ backgroundColor: strengthColor(edge.strength) }}
                >
                  {edge.strength}
                </span>
                {edge.label && <div className={styles.context}>{edge.label}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Regulatory ────────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>REGULATORY</h3>
        {categorized.regulators.length === 0 ? (
          <div className={styles.empty}>No regulatory edges recorded.</div>
        ) : (
          <ul className={styles.list}>
            {categorized.regulators.map(edge => (
              <li key={edge.id} className={styles.row}>
                <span className={styles.name}>{edge.sourceName ?? '—'}</span>
                <span className={styles.edgeType}>{edge.edgeType}</span>
                <span
                  className={styles.badge}
                  style={{ backgroundColor: strengthColor(edge.strength) }}
                >
                  {edge.strength}
                </span>
                {edge.label && <div className={styles.context}>{edge.label}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Sanctions ─────────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>SANCTIONS</h3>
        {categorized.sanctions.length === 0 ? (
          <div className={styles.empty}>No active sanctions.</div>
        ) : (
          <ul className={styles.list}>
            {categorized.sanctions.map(edge => (
              <li key={edge.id} className={styles.row}>
                <span className={styles.name}>{edge.sourceName ?? '—'}</span>
                <span
                  className={styles.badge}
                  style={{ backgroundColor: strengthColor(edge.strength) }}
                >
                  {edge.strength}
                </span>
                {edge.description && (
                  <div className={styles.context}>{edge.description}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Concentration ─────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>CONCENTRATION</h3>
        {company?.systemicImportanceLevel ? (
          <div className={styles.concentration}>
            <div
              className={styles.level}
              style={{ color: systemicLevelColor(company.systemicImportanceLevel) }}
            >
              {company.systemicImportanceLevel}
            </div>
            <p className={styles.concentrationText}>
              Systemic importance level. Indicates strategic criticality of this
              entity within its sector.
            </p>
          </div>
        ) : (
          <div className={styles.pending}>Concentration data: enrichment pending</div>
        )}
      </section>
    </div>
  )
}
