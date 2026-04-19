// src/features/company-view/cards/CompanyPowerSignalsCard.tsx
//
// Composite score + trend arrow + delta + archetype + tier grid (declared vs
// observed divergence) + 6 dimensions bars sorted descending.
//
// Data source: useCompanyPowerIndex (declared) + useCompanyTiers (observed).
// Tier/strength colors are component-local since they don't apply elsewhere.

import type { CompanyPowerIndex, CompanyTiers } from '@/types/companyPowerIndex'
import { C } from '@/shell/tokens'
import styles from '../scss/CompanyPowerSignalsCard.module.scss'

interface Props {
  powerIndex: CompanyPowerIndex | null
  tiers:      CompanyTiers | null
}

function trendGlyph(direction: CompanyPowerIndex['trendDirection']): { char: string; color: string } {
  switch (direction) {
    case 'rising':    return { char: '▲', color: '#00d4aa' }
    case 'declining': return { char: '▼', color: '#e53935' }
    case 'stable':    return { char: '→', color: '#6b7280' }
  }
}

function tierColor(tier: number | null): string {
  if (tier === 1) return '#ffd700'
  if (tier === 2) return '#c0c0c0'
  if (tier === 3) return '#cd7f32'
  return '#6b7280'
}

function dimBarColor(score: number): string {
  if (score >= 90) return '#00d4aa'
  if (score >= 70) return C.teal
  if (score >= 50) return '#f9a825'
  return '#6b7280'
}

function TierChip({
  label,
  declared,
  observed,
}: {
  label: string
  declared: number | null
  observed: number | null | undefined
}) {
  if (declared === null) return null
  const diverges = observed !== null && observed !== undefined && observed !== declared
  const displayTier = diverges ? `${declared} → ${observed}*` : `${declared}`
  return (
    <div className={styles.tierChip}>
      <div className={styles.tierLabel}>{label}</div>
      <div className={styles.tierValue} style={{ color: tierColor(declared) }}>
        {displayTier}
      </div>
    </div>
  )
}

export function CompanyPowerSignalsCard({ powerIndex, tiers }: Props) {
  if (!powerIndex) {
    return (
      <div className={styles.card}>
        <div className={styles.skeleton}>
          <div className={styles.skelBar} />
          <div className={styles.skelBar} />
          <div className={styles.skelBar} />
          <div className={styles.skelLabel}>Loading signals…</div>
        </div>
      </div>
    )
  }

  const trend = trendGlyph(powerIndex.trendDirection)
  const delta =
    powerIndex.compositeScorePrev !== null
      ? powerIndex.compositeScore - powerIndex.compositeScorePrev
      : null

  const dims = [
    { label: 'Technological', score: powerIndex.technologicalScore },
    { label: 'Financial',     score: powerIndex.financialScore },
    { label: 'Political',     score: powerIndex.politicalScore },
    { label: 'Information',   score: powerIndex.informationScore },
    { label: 'Industrial',    score: powerIndex.industrialScore },
    { label: 'Military',      score: powerIndex.militaryScore },
  ].sort((a, b) => b.score - a.score)

  return (
    <div className={styles.card}>
      {/* Composite */}
      <div className={styles.composite}>
        <div className={styles.compositeLabel}>COMPOSITE SCORE</div>
        <div className={styles.compositeRow}>
          <div className={styles.compositeValue}>{powerIndex.compositeScore.toFixed(1)}</div>
          <div className={styles.trend} style={{ color: trend.color }}>
            {trend.char}
            {delta !== null && (
              <span className={styles.delta}>
                {delta >= 0 ? '+' : ''}
                {delta.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Archetype */}
      <div className={styles.archetypeRow}>
        <span className={styles.archetypeLabel}>ARCHETYPE</span>
        <span className={styles.archetypeValue}>{powerIndex.archetypeCode}</span>
      </div>

      {/* Tier grid */}
      <div className={styles.tierGrid}>
        <TierChip label="POL" declared={powerIndex.politicalTier} observed={tiers?.politicalTier} />
        <TierChip label="MIL" declared={powerIndex.militaryTier}  observed={tiers?.militaryTier} />
        <TierChip label="FIN" declared={powerIndex.financialTier} observed={tiers?.financialTier} />
      </div>

      {/* 6 dimensions */}
      <div className={styles.dims}>
        {dims.map(d => (
          <div key={d.label} className={styles.dimRow}>
            <span className={styles.dimLabel}>{d.label}</span>
            <div className={styles.dimBarTrack}>
              <div
                className={styles.dimBarFill}
                style={{ width: `${d.score}%`, backgroundColor: dimBarColor(d.score) }}
              />
            </div>
            <span className={styles.dimScore}>{d.score.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
