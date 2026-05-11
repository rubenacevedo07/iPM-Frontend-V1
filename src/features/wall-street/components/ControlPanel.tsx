import type { WallStreetCluster } from '@/types/wallStreetGraph'
import styles from './ControlPanel.module.scss'

interface Counts {
  visibleNodes: number
  totalNodes: number
  visibleEdges: number
  totalEdges: number
}

export interface ControlPanelProps {
  graphName: string
  counts: Counts
  modelLabel: string
  clusters: WallStreetCluster[]

  tierFilter: 1 | 2 | 3
  onTierFilterChange: (t: 1 | 2 | 3) => void

  strengthThreshold: number
  onStrengthThresholdChange: (v: number) => void

  visibleClusters: Set<string>
  onToggleCluster: (clusterId: string) => void

  showTemporalPending: boolean
  onToggleTemporalPending: () => void

  showNodeLabels: boolean
  onToggleNodeLabels: () => void

  showEdgeLabels: boolean
  onToggleEdgeLabels: () => void
}

const TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Tier 1 only',
  2: 'Tier 1 + 2',
  3: 'All tiers',
}

export function ControlPanel(props: ControlPanelProps) {
  const {
    graphName,
    counts,
    modelLabel,
    clusters,
    tierFilter,
    onTierFilterChange,
    strengthThreshold,
    onStrengthThresholdChange,
    visibleClusters,
    onToggleCluster,
    showTemporalPending,
    onToggleTemporalPending,
    showNodeLabels,
    onToggleNodeLabels,
    showEdgeLabels,
    onToggleEdgeLabels,
  } = props

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.title}>{graphName}</div>
        <div className={styles.subtitle}>
          {counts.totalNodes} nodes · {counts.totalEdges} edges · {modelLabel}
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>Tier filter</div>
        <div className={styles.tierGroup}>
          {([1, 2, 3] as const).map(t => (
            <label key={t} className={styles.tierOption}>
              <input
                type="radio"
                name="ws-tier"
                checked={tierFilter === t}
                onChange={() => onTierFilterChange(t)}
              />
              <span>{TIER_LABEL[t]}</span>
            </label>
          ))}
        </div>
        <div className={styles.counter}>
          Showing {counts.visibleNodes} / {counts.totalNodes} nodes
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          Strength threshold
          <span className={styles.value}>{strengthThreshold.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={strengthThreshold}
          onChange={e => onStrengthThresholdChange(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.counter}>
          Showing {counts.visibleEdges} / {counts.totalEdges} edges
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>Clusters</div>
        <div className={styles.clusterList}>
          {clusters.map(c => {
            const checked = visibleClusters.has(c.id)
            return (
              <label key={c.id} className={styles.clusterRow}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleCluster(c.id)}
                />
                <span
                  className={styles.swatch}
                  style={{ background: c.color }}
                  aria-hidden
                />
                <span className={styles.clusterName}>
                  {c.name}
                </span>
                <span className={styles.clusterCount}>({c.nodeCount})</span>
              </label>
            )
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>View options</div>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={showTemporalPending}
            onChange={onToggleTemporalPending}
          />
          <span>Highlight temporal pending</span>
        </label>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={showNodeLabels}
            onChange={onToggleNodeLabels}
          />
          <span>Show node labels</span>
        </label>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={showEdgeLabels}
            onChange={onToggleEdgeLabels}
          />
          <span>Show edge labels</span>
        </label>
      </section>

      <footer className={styles.footer}>
        <div>Generated: 2026-05-10</div>
        <div>Source: {modelLabel}</div>
        <div className={styles.legend}>
          Tier 1 = always visible. Tier 2 = secondary. Tier 3 = detail.
        </div>
      </footer>
    </aside>
  )
}
