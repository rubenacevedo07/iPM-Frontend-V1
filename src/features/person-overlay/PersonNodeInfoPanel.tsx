import type { NeighborNode, NeighborEdge } from '@/domain/types'
import {
  trumpIdeologyScores,
  trumpStructuralEdges,
} from './personFallbackData'
import './person-overlay.scss'

const EDGE_COLORS: Record<string, string> = {
  Allied:          '#00d4aa',
  Influences:      '#a855f7',
  Finances:        '#f5a623',
  Owns:            '#00e5ff',
  Competes:        '#a855f7',
  Partners:        '#00d4aa',
  Governs:         '#f5a623',
  Regulates:       '#f5a623',
  Sanctions:       '#e53935',
  Supplies:        '#00e5ff',
  Manufactures:    '#00e5ff',
  DependsOn:       '#e53935',
  Pressures:       '#e53935',
  Exports:         '#00d4aa',
  MilitaryConflict:'#e53935',
  Distributes:     '#00e5ff',
  Sets:            '#f5a623',
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(',')
}

interface PersonNodeInfoPanelProps {
  node:          NeighborNode
  edges:         NeighborEdge[]
  centralNodeId: string
  onClose:       () => void
  onOpenRelation?: (nodeId: string) => void
}

export function PersonNodeInfoPanel({
  node,
  edges,
  centralNodeId,
  onClose,
  onOpenRelation,
}: PersonNodeInfoPanelProps) {
  // Edges connecting this node to the central node
  const nodeEdges = edges.filter(
    e => (e.sourceNodeId === node.nodeId && e.targetNodeId === centralNodeId)
      || (e.targetNodeId === node.nodeId && e.sourceNodeId === centralNodeId),
  )

  const isTrump = node.nodeId === 'person:173'
  const initials = node.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // Avatar color: use first edge color or type-derived
  const nodeColor = nodeEdges[0]
    ? (EDGE_COLORS[nodeEdges[0].edgeType] ?? '#00e5ff')
    : '#00e5ff'

  // For trump-specific display, use green (Allied)
  const avatarColor = isTrump ? '#00d4aa' : nodeColor
  const archetypeLabel = isTrump ? 'POLITICAL' : node.type.toUpperCase()

  if (!isTrump) {
    // Simplified panel for non-Trump nodes
    const edgeType = nodeEdges[0]?.edgeType ?? 'CONNECTED'
    const edgeColor = EDGE_COLORS[edgeType] ?? '#6b7a90'
    return (
      <div className="ni__panel">
        <div className="ni__header">
          <div
            className="ni__avatar"
            style={{
              background: `rgba(${hexToRgb(edgeColor)},0.08)`,
              border:     `1.5px solid rgba(${hexToRgb(edgeColor)},0.4)`,
              color:      edgeColor,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ni__name">{node.name}</div>
            <div className="ni__meta">
              <span
                className="badge badge--teal"
                style={{ fontSize: 8, padding: '2px 5px' }}
              >
                {edgeType}
              </span>
            </div>
          </div>
          <button className="ni__close" onClick={onClose}>×</button>
        </div>
        <div className="ni__actions">
          {onOpenRelation && (
            <button
              className="ni__btn-primary"
              onClick={() => onOpenRelation(node.nodeId)}
            >
              ↗ Open Studio Relation
            </button>
          )}
          <button className="ni__btn-secondary">⟁ Traverse Supply Chain</button>
        </div>
      </div>
    )
  }

  // Full Trump panel: header + ideology + structural edges + actions
  return (
    <div className="ni__panel">

      {/* Header */}
      <div className="ni__header">
        <div
          className="ni__avatar"
          style={{
            background: `rgba(${hexToRgb(avatarColor)},0.08)`,
            border:     `1.5px solid rgba(${hexToRgb(avatarColor)},0.4)`,
            color:      avatarColor,
          }}
        >
          DT
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ni__name">Donald Trump</div>
          <div className="ni__meta">
            <span className="badge badge--teal" style={{ fontSize: 8, padding: '2px 5px' }}>
              {archetypeLabel}
            </span>
            <span style={{ color: '#5a6b80', fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>PEP</span>
          </div>
        </div>
        <button className="ni__close" onClick={onClose}>×</button>
      </div>

      {/* Ideology Profile */}
      <div className="ni__section">
        <div className="ni__section-label" style={{ marginBottom: 10 }}>Ideology Profile</div>
        {trumpIdeologyScores.map((s, i) => (
          <div key={i}>
            <div className="ni__score-row">
              <span className="ni__score-label">{s.label}</span>
              <div className="ni__score-track">
                <div className="ni__score-center" />
                <div
                  className="ni__score-fill"
                  style={{
                    left:       '50%',
                    width:      `${s.pct}%`,
                    background: `linear-gradient(90deg, rgba(${hexToRgb(s.color)},0.3), ${s.color})`,
                    borderRadius: '0 3px 3px 0',
                  }}
                />
              </div>
              <span className="ni__score-val" style={{ color: s.color }}>{s.value}</span>
            </div>
            {s.sub && (
              <div className="ni__score-sub">{s.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Structural Edges */}
      <div className="ni__section">
        <div className="ni__section-label" style={{ marginBottom: 8 }}>Structural Edges</div>
        {trumpStructuralEdges.map((e, i) => (
          <div key={i} className="ni__edge">
            <div className="ni__edge-dot" style={{ background: e.color }} />
            <span className="ni__edge-type">{e.type}</span>
            <span className="ni__edge-target">{e.target}</span>
            <span
              className="ni__edge-strength"
              style={{
                color:      e.color,
                background: `rgba(${hexToRgb(e.color)},0.08)`,
                border:     `1px solid rgba(${hexToRgb(e.color)},0.2)`,
              }}
            >
              {e.strength}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="ni__actions">
        {onOpenRelation && (
          <button
            className="ni__btn-primary"
            onClick={() => onOpenRelation(node.nodeId)}
          >
            ↗ Open Studio Relation
          </button>
        )}
        <button className="ni__btn-secondary">⟁ Traverse Supply Chain</button>
      </div>

    </div>
  )
}
