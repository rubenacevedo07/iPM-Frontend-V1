// src/features/headquarters-overlay/HeadquartersCenter.tsx
//
// Center column of the headquarters dual overlay. Mirrors `StudioRelationView`'s
// `.sr__center` block (header + arc + content) but tells a person↔company
// narrative ("CEO of Apple") instead of a person↔person relation.
// Uses the same `.sr__*` SCSS classes from person-overlay.scss for visual
// parity with StudioRelation.

import type { PersonIntelligence } from '@/domain/types'
import type { Company } from '@/types/company'

interface HeadquartersCenterProps {
  person:   PersonIntelligence | null
  company:  Company | null
  /** Edge label from PersonCompany — usually "CEO", "Co-Founder", etc. */
  edgeRole: string
  /** Human-friendly label below the edge role (e.g. "Tesla, Inc.") */
  edgeNote?: string
}

function fmtUsdAbbrev(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(0)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

function avatarSrc(raw: string | null | undefined, dir: 'persons' | 'logos'): string | null {
  if (!raw) return null
  if (raw.startsWith('/') || raw.startsWith('http')) return raw
  return `/${dir}/${raw}`
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function HeadquartersCenter({ person, company, edgeRole, edgeNote }: HeadquartersCenterProps) {
  const personName  = person?.fullName ?? 'CEO'
  const companyName = company?.name ?? '—'

  const photoP = avatarSrc(person?.photoUrl, 'persons')
  const logoC  = avatarSrc(company?.logo,    'logos')

  return (
    <div className="sr__center">

      {/* Header */}
      <div className="sr__header">
        <div className="sr__kicker">Headquarters</div>
        <div className="sr__label">{edgeRole || 'Affiliated'}</div>
        <div className="sr__type" style={{ color: '#00d4aa' }}>
          {edgeNote ?? `${personName} · ${companyName}`}
        </div>

        {/* Arc with avatars: person on the left, company on the right */}
        <div className="sr__arc">
          <svg style={{ width: '100%', height: 64 }} viewBox="0 0 400 64" preserveAspectRatio="none">
            <defs>
              <linearGradient id="hqArcG" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#f5a623" stopOpacity="0.8" />
                <stop offset="50%"  stopColor="#00d4aa" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path d="M 60 48 Q 200 -10 340 48" fill="none" stroke="url(#hqArcG)" strokeWidth="2" />
            <circle cx="60"  cy="48" r="4" fill="#f5a623" opacity="0.85" />
            <circle cx="340" cy="48" r="4" fill="#00e5ff" opacity="0.85" />
            <circle r="3" fill="#00d4aa">
              <animateMotion dur="3s" repeatCount="indefinite" path="M 60 48 Q 200 -10 340 48" />
            </circle>
          </svg>

          {/* Avatar left — person */}
          <div className="sr__arc-ent sr__arc-ent--left">
            <div className="sr__arc-avatar">
              {photoP
                ? <img src={photoP} alt={personName} />
                : initialsOf(personName)}
            </div>
          </div>

          {/* Avatar right — company logo */}
          <div className="sr__arc-ent sr__arc-ent--right">
            <div className="sr__arc-avatar" style={{ background: '#0c1118' }}>
              {logoC
                ? <img src={logoC} alt={companyName} style={{ objectFit: 'contain' }} />
                : initialsOf(companyName)}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="sr__content">

        {/* Headline */}
        <div className="sr__str-meter">
          <div className="sr__str-header">
            <span className="sr__str-label">{edgeRole || 'Role'}</span>
            <span className="sr__str-val" style={{ color: '#00d4aa' }}>{companyName}</span>
          </div>
        </div>

        {/* Company snapshot */}
        <div className="sr__section">
          <div className="sr__section-label">Company Snapshot</div>
          <div className="sr__kv-row">
            <span className="sr__kv-key">Headquarters</span>
            <span className="sr__kv-val">{company?.headquarters ?? '—'}</span>
          </div>
          <div className="sr__kv-row">
            <span className="sr__kv-key">Sector</span>
            <span className="sr__kv-val">{company?.category ?? '—'}</span>
          </div>
          <div className="sr__kv-row">
            <span className="sr__kv-key">Market Cap</span>
            <span className="sr__kv-val" style={{ color: '#f5a623' }}>{fmtUsdAbbrev(company?.marketCapUsd)}</span>
          </div>
          <div className="sr__kv-row">
            <span className="sr__kv-key">Revenue</span>
            <span className="sr__kv-val" style={{ color: '#00e5ff' }}>{fmtUsdAbbrev(company?.revenueUsd)}</span>
          </div>
          {company?.founded != null && (
            <div className="sr__kv-row">
              <span className="sr__kv-key">Founded</span>
              <span className="sr__kv-val">{company.founded}</span>
            </div>
          )}
        </div>

        {/* CEO snapshot */}
        <div className="sr__section">
          <div className="sr__section-label">CEO Snapshot</div>
          <div className="sr__kv-row">
            <span className="sr__kv-key">Name</span>
            <span className="sr__kv-val">{personName}</span>
          </div>
          {person?.title && (
            <div className="sr__kv-row">
              <span className="sr__kv-key">Title</span>
              <span className="sr__kv-val">{person.title}</span>
            </div>
          )}
          {person?.wealth?.netWorthUsd != null && (
            <div className="sr__kv-row">
              <span className="sr__kv-key">Net Worth</span>
              <span className="sr__kv-val" style={{ color: '#f5a623' }}>{fmtUsdAbbrev(person.wealth.netWorthUsd)}</span>
            </div>
          )}
          {person?.globalRank != null && (
            <div className="sr__kv-row">
              <span className="sr__kv-key">Global Rank</span>
              <span className="sr__kv-val" style={{ color: '#00e5ff' }}>#{person.globalRank}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
