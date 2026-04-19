// src/features/company-view/tabs/AnalysisTab.tsx
//
// Phase 5.0b.1 Step 15 — 3 deterministic narrative sections.
// No AI calls. No CEO Vision (PersonVision endpoint doesn't exist yet).

import type { Archetype, CompanyPowerIndex } from '@/types/companyPowerIndex'
import styles from '../scss/AnalysisTab.module.scss'

interface Props {
  powerIndex: CompanyPowerIndex | null
}

const ARCHETYPE_NARRATIVE: Record<Archetype, string> = {
  FINANCIAL:
    'Influence flows through capital allocation, credit access, and ownership stakes. Systemic risk creates implicit leverage over regulatory bodies.',
  POLITICAL:
    'Power derives from government contracts, regulatory capture, and personnel rotation between public and private sectors.',
  COERCIVE:
    'Operates through security infrastructure, surveillance capabilities, and enforcement contracts. Difficult to displace once embedded.',
  INDUSTRIAL:
    'Anchored in physical infrastructure and supply chain chokepoints. Substitution latency measured in years.',
  TECHNOLOGICAL:
    'Dominates through intellectual property, platform leverage, and compute infrastructure. Power compounds via network effects and standards capture.',
  HYBRID:
    'Multi-domain power profile resists single-point disruption. Influence spans technological, financial, and political domains.',
}

function trajectoryText(pi: CompanyPowerIndex): string {
  if (pi.compositeScorePrev === null) {
    return 'Trajectory data pending second measurement cycle.'
  }
  const delta = pi.compositeScore - pi.compositeScorePrev
  if (pi.trendDirection === 'rising') {
    return `Composite score increased by +${delta.toFixed(1)} since last computation. Upward momentum across power dimensions.`
  }
  if (pi.trendDirection === 'declining') {
    return `Composite score declined by ${delta.toFixed(1)} since last computation. Relative influence loss detected.`
  }
  return 'Composite score stable since last computation. Power position holding.'
}

function strategicPositionText(pi: CompanyPowerIndex): string {
  const score = pi.compositeScore
  if (score >= 90) return 'Tier-1 global actor with cross-domain systemic influence. Behavior affects global market dynamics and regulatory regimes.'
  if (score >= 70) return 'Established power with significant cross-domain reach. Material influence in at least two domains.'
  if (score >= 50) return 'Regional or sector-specific influence. Material concentration in home domain without global spillover.'
  return 'Emerging or niche power profile. Influence bounded to narrow vertical.'
}

function trendGlyph(direction: CompanyPowerIndex['trendDirection']): { char: string; color: string } {
  switch (direction) {
    case 'rising':    return { char: '▲', color: '#00d4aa' }
    case 'declining': return { char: '▼', color: '#e53935' }
    case 'stable':    return { char: '→', color: '#6b7280' }
  }
}

export function AnalysisTab({ powerIndex }: Props) {
  if (!powerIndex) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading analysis…</div>
      </div>
    )
  }

  const trend = trendGlyph(powerIndex.trendDirection)
  const computedAt = new Date(powerIndex.computedAt).toLocaleDateString()

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>ARCHETYPE ANALYSIS</h3>
        <div className={styles.archetype}>
          <div className={styles.archetypeCode}>{powerIndex.archetypeCode}</div>
          <p className={styles.narrative}>
            {ARCHETYPE_NARRATIVE[powerIndex.archetypeCode]}
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>POWER TRAJECTORY</h3>
        <div className={styles.trajectoryLine}>
          <span className={styles.trendGlyph} style={{ color: trend.color }}>
            {trend.char}
          </span>
          <p className={styles.narrative}>{trajectoryText(powerIndex)}</p>
        </div>
        <div className={styles.computedAt}>Last computed: {computedAt}</div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>STRATEGIC POSITION</h3>
        <p className={styles.narrative}>{strategicPositionText(powerIndex)}</p>
      </section>
    </div>
  )
}
