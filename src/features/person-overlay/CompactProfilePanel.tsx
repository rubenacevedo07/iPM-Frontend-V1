import { useState } from 'react'
import type { PersonIntelligence } from '@/domain/types'
import type { DemoCompany, DemoConnection, DemoSignal } from './personFallbackData'
import './person-overlay.scss'

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(',')
}

interface CompactProfilePanelProps {
  person:                 PersonIntelligence | null
  side:                   'left' | 'right'
  entityName:             string
  isLoading?:             boolean
  companies:              DemoCompany[]
  connections:            DemoConnection[]
  signals:                DemoSignal[]
  activeConnectionNodeId?: string   // nodeId of the highlighted connection row
}

export function CompactProfilePanel({
  person,
  side,
  entityName,
  isLoading = false,
  companies,
  connections,
  signals,
  activeConnectionNodeId,
}: CompactProfilePanelProps) {
  const [photoError, setPhotoError] = useState(false)

  const displayName = person?.fullName ?? entityName
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const rawPhotoUrl = person?.photoUrl ?? null
  const photoUrl    = rawPhotoUrl
    ? (rawPhotoUrl.startsWith('/') || rawPhotoUrl.startsWith('http')
        ? rawPhotoUrl
        : `/persons/${rawPhotoUrl}`)
    : null

  return (
    <div className={`cp__panel cp__panel--${side}`}>

      {/* Photo — 300px */}
      <div className="cp__photo-wrap" style={{ height: 300 }}>
        {photoUrl && !photoError ? (
          <img
            className="cp__photo"
            src={photoUrl}
            alt={displayName}
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div className="cp__photo-fallback">{initials}</div>
        )}
        <div className="cp__photo-fade" />
      </div>

      {/* Identity */}
      <div className="cp__identity">
        <div className="cp__name">{displayName}</div>
        <div className="cp__title">
          {isLoading ? '…' : (person?.title ?? '—')}
        </div>
        <div className="cp__badges">
          {person?.archetypeCode && (
            <span className="badge badge--teal">{person.archetypeCode}</span>
          )}
          <span className="badge badge--gold">PEP</span>
        </div>
      </div>

      <div className="cp__divider" />

      {/* Key Data — 2×2 KV */}
      <div className="cp__section-wrap">
        <div className="cp__section-label">Key Data</div>
        <div className="cp__kv-grid">
          <div className="cp__kv-cell">
            <div className="cp__kv-key">Net Worth</div>
            <div className="cp__kv-val" style={{ color: '#f5a623' }}>
              {person?.wealth?.netWorthUsd
                ? `$${(person.wealth.netWorthUsd / 1e9).toFixed(0)}B`
                : '—'}
            </div>
          </div>
          <div className="cp__kv-cell">
            <div className="cp__kv-key">Rank</div>
            <div className="cp__kv-val" style={{ color: '#00e5ff' }}>
              {person?.globalRank != null ? `#${person.globalRank}` : '—'}
            </div>
          </div>
          <div className="cp__kv-cell">
            <div className="cp__kv-key">Archetype</div>
            <div className="cp__kv-val">
              {person?.archetypeCode ?? '—'}
            </div>
          </div>
          <div className="cp__kv-cell">
            <div className="cp__kv-key">Domain</div>
            <div className="cp__kv-val">
              {side === 'left' ? 'Tech / Space' : 'Government'}
            </div>
          </div>
        </div>
      </div>

      <div className="cp__divider" />

      {/* Companies (top 3) */}
      <div className="cp__section-wrap">
        <div className="cp__section-label">Companies</div>
        {companies.slice(0, 3).map((c, i) => (
          <div key={i} className="cp__co-row">
            <div className="cp__co-icon" style={{ color: c.color }}>{c.icon}</div>
            <span className="cp__co-name">{c.name}</span>
            {c.role && <span className="cp__co-edge">{c.role}</span>}
            <span className="cp__co-cap">{c.cap}</span>
          </div>
        ))}
      </div>

      <div className="cp__divider" />

      {/* Connections */}
      <div className="cp__section-wrap">
        <div className="cp__section-label">Connections</div>
        {connections.map((c, i) => {
          const isActive = c.nodeId === activeConnectionNodeId
          return (
            <div
              key={i}
              className={`cp__pr${isActive ? ' cp__pr--active' : ''}`}
            >
              <div
                className="cp__pr-avatar"
                style={{
                  background: isActive
                    ? `rgba(${hexToRgb(c.color)},0.12)`
                    : `rgba(${hexToRgb(c.color)},0.08)`,
                  border: isActive
                    ? `1.5px solid rgba(${hexToRgb(c.color)},0.6)`
                    : `1.5px solid rgba(${hexToRgb(c.color)},0.4)`,
                  color: c.color,
                }}
              >
                {c.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="cp__pr-name"
                  style={{ color: isActive ? '#00e5ff' : undefined }}
                >
                  {c.name}
                </div>
                <div className="cp__pr-role">{c.role}</div>
              </div>
              <span className="cp__pr-score" style={{ color: c.scoreColor }}>
                {c.score}
              </span>
            </div>
          )
        })}
      </div>

      <div className="cp__divider" />

      {/* Signals (max 2) */}
      <div className="cp__section-wrap">
        <div className="cp__section-label">Signals</div>
        {signals.slice(0, 2).map((s, i) => (
          <div key={i} className="cp__sig">
            <div className="cp__sig-bar" style={{ background: s.color }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="cp__sig-src" style={{ color: s.color }}>{s.src}</span>
                <span className="cp__sig-age">{s.age}</span>
              </div>
              <div className="cp__sig-text">{s.text}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
