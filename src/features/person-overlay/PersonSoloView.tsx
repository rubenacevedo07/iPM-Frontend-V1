import type { PersonIntelligence, NeighborsResponse } from '@/domain/types'
import type { ActorRefFrom } from 'xstate'
import { useSelector } from '@xstate/react'
import { PersonLeftPanel } from './PersonLeftPanel'
import type { tabsMachine } from '@/machines/tabs.machine'
import {
  elonMuskCompanies,
  elonMuskSignals,
  elonMuskConnections,
  elonMuskClients,
  elonMuskSectors,
} from './personFallbackData'
import './person-overlay.scss'

const TABS = [
  { key: 'overview',    label: 'Overview'     },
  { key: 'trader-view', label: 'Trader View'  },
  { key: 'analyst',     label: 'Analyst'      },
  { key: 'predictions', label: 'Predictions'  },
] as const

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
  entityName,
  isLoading,
  tabsRef,
  onClose,
  onOpenRelation,
}: PersonSoloViewProps) {
  const activeTab = useSelector(tabsRef!, s => s?.context.activeTab ?? 'overview')

  const handleTabClick = (key: string) => {
    tabsRef?.send({ type: 'TAB.SET', tab: key })
  }

  const connections = elonMuskConnections
  const clients     = elonMuskClients
  const sectors     = elonMuskSectors

  return (
    <div className="pe__host">

      {/* Header bar — full width, 56px */}
      <div
        className="pe__header-bar"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="pe__hdr-identity">
          <div className="pe__hdr-avatar">
            {(person?.fullName ?? entityName).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="pe__hdr-name">{person?.fullName ?? entityName}</div>
            <div className="pe__hdr-meta">{person?.title ?? 'CEO · Tech / Space'}</div>
          </div>
        </div>
        <div className="pe__hdr-pills">
          <span className="pe__hdr-pill pe__hdr-pill--live">
            <span className="pe__hdr-pill-dot" />
            LIVE
          </span>
          <span className="pe__hdr-pill pe__hdr-pill--score">
            COMPOSITE {person?.compositeScore ?? 91}
          </span>
          <span className="pe__hdr-pill pe__hdr-pill--rank">
            RANK #{person?.globalRank ?? 4}
          </span>
        </div>
        <button className="ov__close" onClick={onClose}>×</button>
      </div>

      {/* Left panel */}
      <div
        className="pe__left-wrap"
        style={{ pointerEvents: 'auto' }}
      >
        <PersonLeftPanel
          person={person}
          companies={elonMuskCompanies}
          signals={elonMuskSignals}
          entityName={entityName}
          isLoading={isLoading}
        />
      </div>

      {/* Right panel — tabs + scrollable data */}
      <div
        className="pe__right-wrap"
        style={{ pointerEvents: 'auto' }}
      >

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

        {/* Data — stacked cells */}
        <div className="pe__data">

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
          <div className="pe__grid-cell" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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

          {/* Key Data */}
          <div className="pe__grid-cell" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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

          {/* Sector Positions */}
          <div className="pe__grid-cell" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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

          {/* Supply Chain Risk */}
          <div className="pe__grid-cell" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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

        </div>
      </div>

      {/* Bottom bar — full width */}
      <div
        className="pe__bottom-bar"
        style={{ pointerEvents: 'auto' }}
      >
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
