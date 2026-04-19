// src/features/company-view/cards/CompanySignalsCard.tsx
//
// Phase 5.0b.1 Step 10 — news signals feed for the entity.
// Uses useEntityNews(nodeId, 10) and shows top 5 most recent.
// Backend already sorts by publishedAt desc.

import { useEntityNews } from '@/hooks/useEntityNews'
import styles from '../scss/CompanySignalsCard.module.scss'

interface Props {
  nodeId: string  // format: "company:1", "company:96", etc.
}

function importanceColor(importance: string | null): string {
  switch (importance) {
    case 'Critical': return '#e53935'
    case 'High':     return '#ff6b35'
    case 'Medium':   return '#f9a825'
    case 'Low':      return '#6b7280'
    default:         return '#6b7280'
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 10)
  } catch {
    return iso.slice(0, 10)
  }
}

export function CompanySignalsCard({ nodeId }: Props) {
  const { data: news, loading, error } = useEntityNews(nodeId, 10)

  if (loading && news === null) {
    return (
      <div className={styles.card}>
        <div className={styles.sectionTitle}>SIGNALS</div>
        <div className={styles.skeleton}>
          <div className={styles.skelRow} />
          <div className={styles.skelRow} />
          <div className={styles.skelRow} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.card}>
        <div className={styles.sectionTitle}>SIGNALS</div>
        <div className={styles.errorState}>Error loading signals</div>
      </div>
    )
  }

  const topNews = (news ?? []).slice(0, 5)

  if (topNews.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.sectionTitle}>SIGNALS</div>
        <div className={styles.empty}>No signals recorded.</div>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>SIGNALS</div>
      <ul className={styles.list}>
        {topNews.map(item => (
          <li key={item.id} className={styles.row}>
            <div className={styles.metaRow}>
              <span className={styles.date}>{formatDate(item.publishedAt)}</span>
              {item.importance && (
                <span
                  className={styles.badge}
                  style={{ backgroundColor: importanceColor(item.importance) }}
                >
                  {item.importance}
                </span>
              )}
            </div>
            {item.headline && <div className={styles.headline}>{item.headline}</div>}
            {item.summary && <div className={styles.summary}>{item.summary}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
