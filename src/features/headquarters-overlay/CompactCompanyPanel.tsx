// src/features/headquarters-overlay/CompactCompanyPanel.tsx
//
// Sibling of `CompactProfilePanel` — accepts a `Company` instead of a
// `PersonIntelligence`. Keeps the same .cp__* SCSS classes (reused from
// person-overlay.scss) so the right-panel of the headquarters dual overlay
// has visual parity with StudioRelation's right side. No prop polymorphism:
// two small focused components are easier to read than one boolean-driven one.

import { useState } from 'react'
import type { Company } from '@/types/company'
import type { DemoConnection, DemoSignal } from '@/features/person-overlay/personFallbackData'
import '@/features/person-overlay/person-overlay.scss'

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(',')
}

function fmtUsdAbbrev(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(0)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

function fmtCount(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

interface CompactCompanyPanelProps {
  company:                Company | null
  side:                   'left' | 'right'
  entityName:             string
  isLoading?:             boolean
  /** "CEO", "Co-Founder", etc — comes from the PersonCompany edge in HeadquartersView */
  edgeRole?:              string
  /** Top affiliated persons (CEO, CFO, …) — DemoConnection rows */
  topPersons:             DemoConnection[]
  /** Recent news signals about the company */
  signals:                DemoSignal[]
  activeConnectionNodeId?: string
}

export function CompactCompanyPanel({
  company,
  side,
  entityName,
  isLoading = false,
  edgeRole,
  topPersons,
  signals,
  activeConnectionNodeId,
}: CompactCompanyPanelProps) {
  const [logoError, setLogoError] = useState(false)

  const displayName = company?.name ?? entityName
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // Backend ships Company.logo as filename ("apple.png") OR full path/URL.
  // Mirror normalize used by GlowEdge / EntityNode for the graph view.
  const rawLogo = company?.logo ?? null
  const logoUrl = rawLogo
    ? (rawLogo.startsWith('/') || rawLogo.startsWith('http')
        ? rawLogo
        : `/logos/${rawLogo}`)
    : null

  return (
    <div className={`cp__panel cp__panel--${side}`}>

      {/* Logo — 300px (mirrors photo slot in CompactProfilePanel) */}
      <div className="cp__photo-wrap" style={{ height: 300 }}>
        {logoUrl && !logoError ? (
          <img
            className="cp__photo"
            src={logoUrl}
            alt={displayName}
            onError={() => setLogoError(true)}
            style={{ objectFit: 'contain', background: '#0c1118' }}
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
          {isLoading ? '…' : (company?.category ?? company?.market ?? '—')}
        </div>
        <div className="cp__badges">
          {edgeRole && <span className="badge badge--teal">{edgeRole}</span>}
          {company?.ticker && <span className="badge badge--gold">{company.ticker}</span>}
        </div>
      </div>

      <div className="cp__divider" />

      {/* Key Data — 2×2 KV */}
      <div className="cp__section-wrap">
        <div className="cp__section-label">Key Data</div>
        <div className="cp__kv-grid">
          <div className="cp__kv-cell">
            <div className="cp__kv-key">Market Cap</div>
            <div className="cp__kv-val" style={{ color: '#f5a623' }}>
              {fmtUsdAbbrev(company?.marketCapUsd)}
            </div>
          </div>
          <div className="cp__kv-cell">
            <div className="cp__kv-key">Revenue</div>
            <div className="cp__kv-val" style={{ color: '#00e5ff' }}>
              {fmtUsdAbbrev(company?.revenueUsd)}
            </div>
          </div>
          <div className="cp__kv-cell">
            <div className="cp__kv-key">Employees</div>
            <div className="cp__kv-val">
              {fmtCount(company?.employees)}
            </div>
          </div>
          <div className="cp__kv-cell">
            <div className="cp__kv-key">Founded</div>
            <div className="cp__kv-val">
              {company?.founded ?? '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="cp__divider" />

      {/* HQ + Country (mirrors "Companies" slot — but a single row) */}
      <div className="cp__section-wrap">
        <div className="cp__section-label">Headquarters</div>
        <div className="cp__co-row">
          <div className="cp__co-icon" style={{ color: '#00e5ff' }}>📍</div>
          <span className="cp__co-name">{company?.headquarters ?? '—'}</span>
          <span className="cp__co-edge">{company?.country ?? ''}</span>
        </div>
      </div>

      <div className="cp__divider" />

      {/* Top persons (CEO, founders, …) — same DOM as Connections in CompactProfilePanel */}
      <div className="cp__section-wrap">
        <div className="cp__section-label">Top People</div>
        {topPersons.map((c, i) => {
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

      {/* Signals (max 2) — verbatim from CompactProfilePanel */}
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
