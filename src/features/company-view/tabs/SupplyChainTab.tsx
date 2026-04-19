// src/features/company-view/tabs/SupplyChainTab.tsx
//
// Phase 5.0b.1 Step 13 — LIST form per plan. Canvas graph in Phase 5.0b.2.
//
// Two sections: DEPENDS ON + SUPPLIES TO. Each grouped by strength tier
// (Critical → High → Medium → Low) and colored accordingly.
// Uses edge.label for rich context per chunk-2 lesson #2.

import type { RelationEdgeDto, Strength } from '@/types/relationEdge'
import { strengthColor } from '../shared'
import styles from '../scss/SupplyChainTab.module.scss'

interface Props {
  suppliers: RelationEdgeDto[]
  clients:   RelationEdgeDto[]
}

const STRENGTH_ORDERED: Strength[] = ['Critical', 'High', 'Medium', 'Low']

function groupByStrength(
  edges: RelationEdgeDto[],
): Array<{ strength: Strength; edges: RelationEdgeDto[] }> {
  const groups: Record<Strength, RelationEdgeDto[]> = {
    Critical: [], High: [], Medium: [], Low: [],
  }
  edges.forEach(e => {
    groups[e.strength].push(e)
  })
  return STRENGTH_ORDERED
    .filter(s => groups[s].length > 0)
    .map(s => ({ strength: s, edges: groups[s] }))
}

function EdgeListSection({
  title,
  count,
  edges,
}: {
  title: string
  count: number
  edges: RelationEdgeDto[]
}) {
  if (count === 0) {
    return (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {title} <span className={styles.count}>(0)</span>
        </h3>
        <div className={styles.empty}>No edges recorded.</div>
      </section>
    )
  }
  const groups = groupByStrength(edges)
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {title} <span className={styles.count}>({count})</span>
      </h3>
      {groups.map(({ strength, edges: groupEdges }) => (
        <div key={strength} className={styles.group}>
          <div
            className={styles.groupHeader}
            style={{ color: strengthColor(strength) }}
          >
            {strength.toUpperCase()}
            <span className={styles.groupCount}>({groupEdges.length})</span>
          </div>
          <ul className={styles.edgeList}>
            {groupEdges.map(edge => (
              <li key={edge.id} className={styles.row}>
                <div className={styles.mainLine}>
                  <span className={styles.targetName}>{edge.targetName ?? '—'}</span>
                  {edge.targetTicker && (
                    <span className={styles.targetTicker}>{edge.targetTicker}</span>
                  )}
                </div>
                {edge.label && (
                  <div className={styles.context}>{edge.label}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

export function SupplyChainTab({ suppliers, clients }: Props) {
  return (
    <div className={styles.container}>
      <EdgeListSection title="DEPENDS ON" count={suppliers.length} edges={suppliers} />
      <EdgeListSection title="SUPPLIES TO" count={clients.length} edges={clients} />

      <div className={styles.futurePlaceholder}>
        {/* Interactive supply chain graph — Phase 5.0b.2 */}
        Canvas graph — Phase 5.0b.2
      </div>
    </div>
  )
}
