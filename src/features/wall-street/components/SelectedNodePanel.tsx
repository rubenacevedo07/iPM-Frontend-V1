import type {
  WallStreetCluster,
  WallStreetNodeData,
  WallStreetRawEdge,
} from '@/types/wallStreetGraph'
import styles from './SelectedNodePanel.module.scss'

export interface SelectedNodePanelProps {
  node: WallStreetNodeData
  clusters: WallStreetCluster[]
  allNodes: WallStreetNodeData[]
  allEdges: WallStreetRawEdge[]
  onClose: () => void
}

interface ConnectedEdgeRow {
  edge: WallStreetRawEdge
  direction: 'out' | 'in'
  otherNodeId: string
  otherNodeName: string
}

export function SelectedNodePanel(props: SelectedNodePanelProps) {
  const { node, clusters, allNodes, allEdges, onClose } = props

  const nodeNameById = new Map<string, string>()
  for (const n of allNodes) nodeNameById.set(n.entityId, n.canonicalName)

  const connectedEdges: ConnectedEdgeRow[] = allEdges
    .filter(e => e.source === node.entityId || e.target === node.entityId)
    .map(e => {
      const direction: 'out' | 'in' = e.source === node.entityId ? 'out' : 'in'
      const otherNodeId = direction === 'out' ? e.target : e.source
      return {
        edge: e,
        direction,
        otherNodeId,
        otherNodeName: nodeNameById.get(otherNodeId) ?? otherNodeId,
      }
    })
    .sort(
      (a, b) => (b.edge.data.strengthValue ?? 0) - (a.edge.data.strengthValue ?? 0),
    )

  const nodeClusters = clusters.filter(c => node.clusterIds.includes(c.id))

  const wikiUrl = node.wikiSlug
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(node.wikiSlug)}`
    : null

  const confidenceLabel =
    node.modelCount >= 3 ? 'high' : node.modelCount === 2 ? 'medium' : 'low'

  return (
    <aside className={styles.panel}>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      <div className={styles.head}>
        <div className={styles.canonicalName}>{node.canonicalName}</div>
        <div className={styles.entityType}>
          {node.entityType.replace(/_/g, ' ')}
          {node.entitySubtype ? ` · ${node.entitySubtype.replace(/_/g, ' ')}` : ''}
        </div>
      </div>

      {node.aliasNames.length > 0 && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Aliases</span>
          <span className={styles.rowValue}>{node.aliasNames.join(', ')}</span>
        </div>
      )}

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Tier</div>
          <div className={styles.statValue}>{node.relevanceTier}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Models</div>
          <div className={styles.statValue}>{node.modelCount}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Confidence</div>
          <div className={styles.statValue}>{confidenceLabel}</div>
        </div>
      </div>

      {nodeClusters.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Clusters</div>
          <div className={styles.clusterList}>
            {nodeClusters.map(c => (
              <div key={c.id} className={styles.clusterRow}>
                <span className={styles.swatch} style={{ background: c.color }} />
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          Connected edges ({connectedEdges.length})
        </div>
        <div className={styles.edgeList}>
          {connectedEdges.length === 0 && (
            <div className={styles.emptyEdges}>No connections.</div>
          )}
          {connectedEdges.map(row => {
            const arrow = row.direction === 'out' ? '→' : '←'
            const strength = row.edge.data.strengthValue
            return (
              <div key={row.edge.id} className={styles.edgeRow}>
                <span className={styles.edgeArrow}>{arrow}</span>
                <span className={styles.edgeType}>{row.edge.data.edgeType}</span>
                <span className={styles.edgeArrow}>→</span>
                <span className={styles.edgeOther}>{row.otherNodeName}</span>
                {strength !== null && (
                  <span className={styles.edgeStrength}>
                    ({strength.toFixed(2)})
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {wikiUrl && (
        <a
          className={styles.wikiBtn}
          href={wikiUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open Wikipedia ↗
        </a>
      )}
    </aside>
  )
}
