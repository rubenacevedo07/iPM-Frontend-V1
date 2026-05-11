import { AppActor } from '@/app/AppProviders'
import { PersonLeftPanel } from '@/features/person-overlay/PersonLeftPanel'
import {
  elonMuskFallback,
  elonMuskCompanies,
  elonMuskSignals,
  elonMuskConnections,
  elonMuskClients,
  elonMuskSectors,
} from '@/features/person-overlay/personFallbackData'
import '@/features/person-overlay/person-overlay.scss'
import './gold-overlay.scss'

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}

interface GoldOverlayProps {
  entityName: string
}

export function GoldOverlay({ entityName }: GoldOverlayProps) {
  const appRef = AppActor.useActorRef()
  const handleClose = () => appRef.send({ type: 'CLOSE_OVERLAY' })

  return (
    <div className="gov__root">
      {/* Left panel */}
      <div className="gov__panel-wrap">
        <button className="gov__close" onClick={handleClose}>×</button>
        <PersonLeftPanel
          person={elonMuskFallback}
          companies={elonMuskCompanies}
          signals={elonMuskSignals}
          entityName={entityName}
          isLoading={false}
        />
      </div>

      {/* Bottom panel */}
      <div className="gov__bottom">
        {/* Key Connections */}
        <div className="gov__bottom-section">
          <div className="pe__section-label">Key Connections</div>
          {elonMuskConnections.map((c, i) => (
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

        {/* Key Clients & Partners */}
        <div className="gov__bottom-section">
          <div className="pe__section-label">Key Clients &amp; Partners</div>
          {elonMuskClients.map((c, i) => (
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
        <div className="gov__bottom-section">
          <div className="pe__section-label">Sector Positions</div>
          {elonMuskSectors.map((s, i) => (
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

      {/* Right panel — Key Data */}
      <div className="gov__right">
        <div className="pe__section-label">Key Data</div>
        <div className="pe__kv-grid">
          <div className="pe__kv-cell">
            <div className="pe__kv-key">Net Worth</div>
            <div className="pe__kv-val" style={{ color: '#f5a623' }}>
              {elonMuskFallback.wealth?.netWorthUsd
                ? `$${(elonMuskFallback.wealth.netWorthUsd / 1e9).toFixed(0)}B`
                : '$340B'}
            </div>
          </div>
          <div className="pe__kv-cell">
            <div className="pe__kv-key">Global Rank</div>
            <div className="pe__kv-val" style={{ color: '#00e5ff' }}>
              #{elonMuskFallback.globalRank ?? 4}
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
  )
}
