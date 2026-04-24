import { useState } from 'react'
import type { PersonIntelligence, NeighborsResponse } from '@/domain/types'
import type { ActorRefFrom } from 'xstate'
import { useSelector } from '@xstate/react'
import { PersonLeftPanel } from './PersonLeftPanel'
import { ShapeEgoGraph } from './ShapeEgoGraph'
import { PersonNodeInfoPanel } from './PersonNodeInfoPanel'
import type { tabsMachine } from '@/machines/tabs.machine'
import {
  elonMuskCompanies,
  elonMuskSignals,
  elonMuskConnections,
  elonMuskClients,
  elonMuskSectors,
} from './personFallbackData'
import './person-overlay.scss'

// Tab labels as in v10
const TABS = [
  { key: 'overview',    label: 'Overview'     },
  { key: 'trader-view', label: 'Trader View'  },
  { key: 'analyst',     label: 'Analyst'      },
  { key: 'predictions', label: 'Predictions'  },
] as const

// View switcher labels
const GRAPH_VIEWS = ['NETWORK', 'SPHERE', 'FORCE'] as const

interface PersonSoloViewProps {
  person:       PersonIntelligence | undefined
  neighbors:    NeighborsResponse | undefined
  entityName:   string
  entityNodeId: string
  isLoading:    boolean
  tabsRef:      ActorRefFrom<typeof tabsMachine> | null
  onClose:      () => void
  onTabChange:  (tab: string) => void
  onOpenRelation?: (targetNodeId: string, targetName: string) => void
}

export function PersonSoloView({
  person,
  neighbors,
  entityName,
  entityNodeId,
  isLoading,
  tabsRef,
  onClose,
  onOpenRelation,
}: PersonSoloViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [graphView, setGraphView] = useState<string>('NETWORK')

  const activeTab = useSelector(tabsRef!, s => s?.context.activeTab ?? 'overview')

  const nodes = neighbors?.nodes ?? []
  const edges = neighbors?.edges ?? []

  const selectedNode = selectedNodeId
    ? nodes.find(n => n.nodeId === selectedNodeId) ?? null
    : null

  const handleNodeClick = (nodeId: string) => {
    if (nodeId === entityNodeId) return
    setSelectedNodeId(prev => (prev === nodeId ? null : nodeId))
  }

  const handleTabClick = (key: string) => {
    tabsRef?.send({ type: 'TAB.SET', tab: key })
  }

  const handleOpenRelation = (nodeId: string) => {
    const node = nodes.find(n => n.nodeId === nodeId)
    if (node && onOpenRelation) {
      onOpenRelation(nodeId, node.name)
    }
  }

  // For demo: if no neighbors data, show fallback connections
  const connections = elonMuskConnections
  const clients     = elonMuskClients
  const sectors     = elonMuskSectors

  return (
    <div className="ov__root">
      {/* Close */}
      <button className="ov__close" onClick={onClose}>×</button>

      {/* Left Panel */}
      <PersonLeftPanel
        person={person}
        companies={elonMuskCompanies}
        signals={elonMuskSignals}
        entityName={entityName}
        isLoading={isLoading}
      />

      {/* Right area — flex column */}
      <div className="pe__right">

        {/* Visual zone — ego graph */}
        <div className="pe__visual-zone">

          {/* View switcher — top right */}
          <div className="pe__vs-wrap">
            {GRAPH_VIEWS.map(v => (
              <button
                key={v}
                className={`pe__vs-btn${graphView === v ? ' pe__vs-btn--active' : ''}`}
                onClick={() => setGraphView(v)}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Ego graph */}
          <ShapeEgoGraph
            centralNodeId={entityNodeId}
            centralName={person?.fullName ?? entityName}
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeId}
          />

          {/* Node Info Panel — absolute bottom-left */}
          {selectedNode && (
            <PersonNodeInfoPanel
              node={selectedNode}
              edges={edges}
              centralNodeId={entityNodeId}
              onClose={() => setSelectedNodeId(null)}
              onOpenRelation={onOpenRelation ? handleOpenRelation : undefined}
            />
          )}
        </div>

        {/* Nav tabs */}
        <div className="pe__nav">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`pe__tab${activeTab === t.key ? ' pe__tab--active' : ''}`}
              onClick={() => handleTabClick(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Data grid */}
        <div className="pe__data">

          {/* Row 1: 3 columns */}
          <div className="pe__grid-row-3">
            {/* Key Connections */}
            <div className="pe__grid-cell">
              <div className="pe__section-label">Key Connections</div>
              {connections.map((c, i) => (
                <div
                  key={i}
                  className="pe__pr"
                  onClick={() => {
                    if (c.nodeId === 'person:173' && onOpenRelation) {
                      onOpenRelation('person:173', 'Donald Trump')
                    }
                  }}
                  style={{ cursor: c.nodeId === 'person:173' ? 'pointer' : 'default' }}
                >
                  <div
                    className="pe__pr-avatar"
                    style={{
                      background:  `rgba(${hexToRgb(c.color)},0.08)`,
                      border:      `1.5px solid rgba(${hexToRgb(c.color)},0.4)`,
                      color:       c.color,
                    }}
                  >
                    {c.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pe__pr-name">{c.name}</div>
                    <div className="pe__pr-role">{c.role}</div>
                  </div>
                  <span className="pe__pr-score" style={{ color: c.scoreColor }}>{c.score}</span>
                </div>
              ))}
            </div>

            {/* Key Clients & Partners */}
            <div className="pe__grid-cell">
              <div className="pe__section-label">Key Clients &amp; Partners</div>
              {clients.map((c, i) => (
                <div key={i} className="pe__pr">
                  <div
                    className="pe__pr-avatar"
                    style={{
                      background: `rgba(${hexToRgb(c.color)},0.08)`,
                      border:     `1.5px solid rgba(${hexToRgb(c.color)},0.4)`,
                      color:      c.color,
                    }}
                  >
                    {c.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pe__pr-name">{c.name}</div>
                    <div className="pe__pr-role">{c.role}</div>
                  </div>
                  <span className="pe__pr-score" style={{ color: c.scoreColor }}>{c.score}</span>
                </div>
              ))}
            </div>

            {/* Sector Positions */}
            <div className="pe__grid-cell">
              <div className="pe__section-label">Sector Positions</div>
              {sectors.map((s, i) => (
                <div key={i} className="pe__sector-row">
                  <span className="pe__sector-name">{s.name}</span>
                  <span
                    className="pe__sector-badge"
                    style={{
                      color:      s.color,
                      background: `rgba(${hexToRgb(s.color)},0.06)`,
                      border:     `1px solid rgba(${hexToRgb(s.color)},0.2)`,
                    }}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: 2 columns */}
          <div className="pe__grid-row-2">
            {/* Supply Chain Risk */}
            <div className="pe__grid-cell">
              <div className="pe__section-label">Supply Chain Risk · 16</div>
              <div className="pe__risk-card pe__risk-card--critical">
                <div className="pe__risk-header">
                  <span className="pe__risk-name">Detroit / Shanghai</span>
                  <span className="badge badge--red">CRITICAL</span>
                </div>
              </div>
              <div style={{ marginTop: 6 }}>
                {[
                  { color: '#e53935', name: 'Gigafactory Shanghai', meta: 'China · 20K emp · Critical dep.' },
                  { color: '#f5a623', name: 'Gigafactory Texas',    meta: 'Austin · 12K emp'               },
                  { color: '#00e5ff', name: 'Boca Chica Starbase',  meta: 'TX · SpaceX launch'             },
                ].map((f, i) => (
                  <div key={i} className="pe__facility">
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: f.color, flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <div className="pe__facility-name">{f.name}</div>
                      <div className="pe__facility-meta">{f.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Data */}
            <div className="pe__grid-cell">
              <div className="pe__section-label">Key Data</div>
              <div className="pe__kv-grid">
                <div className="pe__kv-cell">
                  <div className="pe__kv-key">Net Worth</div>
                  <div className="pe__kv-val" style={{ color: '#f5a623' }}>
                    {person?.wealth?.netWorthUsd
                      ? `$${(person.wealth.netWorthUsd / 1e9).toFixed(0)}B`
                      : '$340B'}
                  </div>
                </div>
                <div className="pe__kv-cell">
                  <div className="pe__kv-key">Global Rank</div>
                  <div className="pe__kv-val" style={{ color: '#00e5ff' }}>
                    #{person?.globalRank ?? 4}
                  </div>
                </div>
                <div className="pe__kv-cell">
                  <div className="pe__kv-key">Archetype</div>
                  <div className="pe__kv-val">Hybrid</div>
                </div>
                <div className="pe__kv-cell">
                  <div className="pe__kv-key">Domain</div>
                  <div className="pe__kv-val">Tech / Space</div>
                </div>
                <div className="pe__kv-cell">
                  <div className="pe__kv-key">Citizenship</div>
                  <div className="pe__kv-val">USA / ZA</div>
                </div>
                <div className="pe__kv-cell">
                  <div className="pe__kv-key">Born</div>
                  <div className="pe__kv-val">1971</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar — grid-column 1/-1 */}
      <div className="pe__bottom-bar">
        <span className="pe__bar-label">VIEWING</span>
        <span className="pe__bar-value pe__bar-value--teal">
          {(person?.fullName ?? entityName).toUpperCase()}
        </span>
        <div className="pe__bar-sep" />
        <span className="pe__bar-label">COMPOSITE</span>
        <span className="pe__bar-value pe__bar-value--teal">
          {person?.compositeScore ?? 91}
        </span>
        <div className="pe__bar-sep" />
        <span className="pe__bar-label">RANK</span>
        <span className="pe__bar-value pe__bar-value--gold">#{person?.globalRank ?? 4}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <span className="pe__bar-live">
            <span className="pe__bar-live-dot" />
            LIVE
          </span>
          <span className="badge badge--teal">6 EDGES · 3 TIMELINES</span>
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(',')
}
