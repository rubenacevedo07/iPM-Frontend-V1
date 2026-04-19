// src/features/company-view/cards/CompanyKeyPeopleCard.tsx
//
// Phase 5.0b.1 Step 9 — READ-ONLY key people card.
//
// Filters edges to Person → Company Governs only. Sort by strength category
// (Critical → Low) since backend DTO doesn't include baselineRiskScore
// (Option A per RelationEdge vs EdgeRiskScore discussion).
//
// INTENTIONALLY READ-ONLY for Phase 5.0b.1: no onClick, no cursor:pointer.
// TODO 5.0c: wire /person/{slug}-{id} navigation when PersonView exists.

import { useState } from 'react'
import type { RelationEdgeDto, Strength } from '@/types/relationEdge'
import { strengthColor } from '../shared'
import styles from '../scss/CompanyKeyPeopleCard.module.scss'

interface Props {
  edges:     RelationEdgeDto[] | null
  companyId: number
}

const STRENGTH_ORDER: Record<Strength, number> = {
  Critical: 0,
  High:     1,
  Medium:   2,
  Low:      3,
}

export function CompanyKeyPeopleCard({ edges, companyId }: Props) {
  const [showAll, setShowAll] = useState(false)

  if (edges === null) {
    return (
      <div className={styles.card}>
        <div className={styles.sectionTitle}>KEY PEOPLE</div>
        <div className={styles.skeleton}>
          <div className={styles.skelRow} />
          <div className={styles.skelRow} />
          <div className={styles.skelRow} />
        </div>
      </div>
    )
  }

  const governance = edges.filter(
    e =>
      e.sourceType === 'Person' &&
      e.targetType === 'Company' &&
      e.targetId === companyId &&
      e.edgeType === 'Governs',
  )

  const sorted = [...governance].sort(
    (a, b) => STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength],
  )

  if (sorted.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.sectionTitle}>KEY PEOPLE</div>
        <div className={styles.empty}>No governance edges recorded.</div>
      </div>
    )
  }

  const visible = showAll ? sorted : sorted.slice(0, 3)
  const hiddenCount = sorted.length - 3

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>KEY PEOPLE</div>
      <ul className={styles.list}>
        {visible.map(edge => (
          <li key={edge.id} className={styles.personRow}>
            {/* TODO 5.0c: wire navigation to /person/{slug}-{id} */}
            <div className={styles.photoSlot}>
              {edge.sourcePhoto ? (
                <img
                  src={`/persons/${edge.sourcePhoto}`}
                  alt={edge.sourceName ?? 'person'}
                  className={styles.photo}
                />
              ) : (
                <div className={styles.photoFallback}>
                  {(edge.sourceName ?? '?').slice(0, 1)}
                </div>
              )}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>{edge.sourceName ?? '—'}</div>
              {edge.label && <div className={styles.role}>{edge.label}</div>}
              <div
                className={styles.strengthBadge}
                style={{ backgroundColor: strengthColor(edge.strength) }}
              >
                {edge.strength}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? '− show less' : `+ ${hiddenCount} more`}
        </button>
      )}
    </div>
  )
}
