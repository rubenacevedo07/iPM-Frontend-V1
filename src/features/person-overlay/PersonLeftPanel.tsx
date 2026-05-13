import { useState, useEffect } from 'react'
import type { PersonIntelligence } from '@/domain/types'
import type { DemoCompany, DemoSignal } from './personFallbackData'
import './person-overlay.scss'

interface PersonLeftPanelProps {
  person:    PersonIntelligence | undefined
  companies: DemoCompany[]
  signals:   DemoSignal[]
  entityName: string
  isLoading:  boolean
}

export function PersonLeftPanel({
  person,
  companies,
  signals,
  entityName,
  isLoading,
}: PersonLeftPanelProps) {
  const [photoError, setPhotoError] = useState(false)
  const displayName = person?.fullName ?? entityName

  const rawPhotoUrl = person?.photoUrl ?? null
  const photoUrl = rawPhotoUrl
    ? (rawPhotoUrl.startsWith('/') || rawPhotoUrl.startsWith('http')
        ? rawPhotoUrl
        : `/persons/${rawPhotoUrl}`)
    : null
  useEffect(() => { setPhotoError(false) }, [photoUrl])
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="pe__panel">

      {/* Photo — 320px, object-fit cover, top center */}
      <div className="pe__photo-wrap" style={{ height: 320 }}>
        {photoUrl && !photoError ? (
          <img
            className="pe__photo"
            src={photoUrl}
            alt={displayName}
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div className="pe__photo-fallback">{initials}</div>
        )}
        <div className="pe__photo-fade" />
      </div>

      {/* Identity block */}
      <div className="pe__identity">
        <div className="pe__name">{displayName}</div>
        <div className="pe__title">
          {isLoading ? 'Loading…' : (person?.title ?? '—')}
        </div>
        <div className="pe__badges">
          {person?.archetypeCode && (
            <span className="badge badge--teal">{person.archetypeCode}</span>
          )}
          {person?.archetypeCode === 'TECHNOLOGICAL' && (
            <span className="badge badge--purple">TECHNOLOGICAL</span>
          )}
          <span className="badge badge--gold">PEP</span>
        </div>
      </div>

      <div className="pe__divider" />

      {/* Companies */}
      <div className="pe__section-wrap">
        <div className="pe__section-label">Companies</div>
        {companies.map((c, i) => (
          <div key={i} className="pe__co-row">
            <div className="pe__co-icon" style={{ color: c.color }}>{c.icon}</div>
            <span className="pe__co-name">{c.name}</span>
            {c.role && <span className="pe__co-edge">{c.role}</span>}
            <span className="pe__co-cap">{c.cap}</span>
          </div>
        ))}
      </div>

      <div className="pe__divider" />

      {/* Signals */}
      <div className="pe__section-wrap">
        <div className="pe__section-label">Signals</div>
        {signals.map((s, i) => (
          <div key={i} className="pe__sig">
            <div className="pe__sig-bar" style={{ background: s.color }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="pe__sig-src" style={{ color: s.color }}>{s.src}</span>
                <span className="pe__sig-age">{s.age}</span>
              </div>
              <div className="pe__sig-text">{s.text}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
