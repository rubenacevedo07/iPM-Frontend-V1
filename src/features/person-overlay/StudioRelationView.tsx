import type { ActorRefFrom } from 'xstate'
import { useQuery } from '@tanstack/react-query'
import type { EntityRef } from '@/domain/types'
import type { entityInspectorMachine } from '@/machines/entity-inspector.machine'
import { qk, fetchers } from '@/domain/queries'
import { CompactProfilePanel } from './CompactProfilePanel'
import {
  elonMuskFallback,
  donaldTrumpFallback,
  elonMuskCompanies,
  elonMuskSignals,
  elonMuskConnections,
  trumpCompanies,
  trumpSignals,
  trumpConnections,
  elonTrumpRelation,
} from './personFallbackData'
import './person-overlay.scss'

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(',')
}

interface StudioRelationViewProps {
  entityA:     EntityRef
  entityB:     EntityRef
  inspectorRef: ActorRefFrom<typeof entityInspectorMachine>
  onClose:     () => void
}

export function StudioRelationView({
  entityA,
  entityB,
  inspectorRef,
  onClose,
}: StudioRelationViewProps) {

  // ── Data fetching ─────────────────────────────
  const { data: personA, isLoading: loadingA } = useQuery({
    queryKey: qk.person(entityA.id),
    queryFn:  () => fetchers.person(entityA.id),
    enabled:  !!entityA.id && entityA.type === 'PERSON',
  })

  const { data: personB, isLoading: loadingB } = useQuery({
    queryKey: qk.person(entityB.id),
    queryFn:  () => fetchers.person(entityB.id),
    enabled:  !!entityB.id && entityB.type === 'PERSON',
  })

  const handleBack = () => {
    inspectorRef.send({ type: 'RELATION.CLOSE' })
  }

  // Fallbacks
  const dataA = personA ?? (entityA.id === 7 ? elonMuskFallback : null)
  const dataB = personB ?? (entityB.id === 173 ? donaldTrumpFallback : null)

  // Relation data — use demo fallback
  const rel = elonTrumpRelation

  // Photos for arc avatars
  const photoA = dataA?.photoUrl ?? null
  const photoB = dataB?.photoUrl ?? null
  const initialsA = entityA.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const initialsB = entityB.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // Left panel connections: show entityB as active
  const leftConnections = elonMuskConnections
  // Right panel connections: show entityA as active
  const rightConnections = trumpConnections

  return (
    <div className="sr__root">

      {/* Close */}
      <button className="ov__close" onClick={onClose}>×</button>

      {/* LEFT: Entity A */}
      <CompactProfilePanel
        person={dataA}
        side="left"
        entityName={entityA.name}
        isLoading={loadingA}
        companies={elonMuskCompanies}
        connections={leftConnections}
        signals={elonMuskSignals}
        activeConnectionNodeId={entityB.nodeId}
      />

      {/* CENTER: Studio Relation */}
      <div className="sr__center">

        {/* Header */}
        <div className="sr__header">
          <div className="sr__kicker">Studio Relation</div>
          <div className="sr__label">Allied</div>
          <div className="sr__type" style={{ color: '#00d4aa' }}>
            Strength {rel.strengthPct}% · Active since 2024
          </div>

          {/* Arc SVG with entity avatars */}
          <div className="sr__arc">
            <svg style={{ width: '100%', height: 64 }} viewBox="0 0 400 64" preserveAspectRatio="none">
              <defs>
                <linearGradient id="arcG" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#00e5ff" stopOpacity="0.8" />
                  <stop offset="50%"  stopColor="#00d4aa" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path d="M 60 48 Q 200 -10 340 48" fill="none" stroke="url(#arcG)" strokeWidth="2" />
              <circle cx="60"  cy="48" r="4" fill="#00e5ff" opacity="0.8" />
              <circle cx="340" cy="48" r="4" fill="#00e5ff" opacity="0.8" />
              <circle r="3" fill="#00e5ff">
                <animateMotion dur="3s" repeatCount="indefinite" path="M 60 48 Q 200 -10 340 48" />
              </circle>
            </svg>

            {/* Avatar left */}
            <div className="sr__arc-ent sr__arc-ent--left">
              <div className="sr__arc-avatar">
                {photoA
                  ? <img src={photoA} alt={entityA.name} />
                  : initialsA}
              </div>
            </div>

            {/* Avatar right */}
            <div className="sr__arc-ent sr__arc-ent--right">
              <div className="sr__arc-avatar">
                {photoB
                  ? <img src={photoB} alt={entityB.name} />
                  : initialsB}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="sr__content">

          {/* Back button */}
          <button className="sr__back-btn" onClick={handleBack}>
            <span style={{ fontSize: 14 }}>←</span> Back to overview
          </button>

          {/* Edge Strength */}
          <div className="sr__str-meter">
            <div className="sr__str-header">
              <span className="sr__str-label">Edge Strength</span>
              <span className="sr__str-val" style={{ color: '#00d4aa' }}>{rel.score}</span>
            </div>
            <div className="sr__str-track">
              <div
                className="sr__str-fill"
                style={{
                  width:      `${rel.strengthPct}%`,
                  background: 'linear-gradient(90deg, rgba(0,229,255,0.3), #00d4aa)',
                }}
              />
            </div>
          </div>

          {/* Edge Details */}
          <div>
            <div className="sr__section-label">Edge Details</div>
            <div className="sr__details-grid">
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Edge Type</div>
                <div className="sr__kv-val" style={{ color: '#00d4aa' }}>Allied</div>
              </div>
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Risk Score</div>
                <div className="sr__kv-val" style={{ color: '#f5a623' }}>{rel.riskScore} / 5</div>
              </div>
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Linked Timelines</div>
                <div className="sr__kv-val" style={{ color: '#a855f7' }}>3</div>
              </div>
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Severity</div>
                <div className="sr__kv-val" style={{ color: '#f5a623' }}>{rel.severity}</div>
              </div>
            </div>
          </div>

          {/* Relation Analysis */}
          <div>
            <div className="sr__section-label">Relation Analysis</div>
            <div className="sr__analysis-desc">{rel.analysis}</div>
          </div>

          {/* Power Dynamic */}
          <div>
            <div className="sr__section-label">Power Dynamic</div>
            <div className="sr__power-dyn">{rel.powerDynamic}</div>
          </div>

          {/* Key Levers */}
          <div>
            <div className="sr__section-label">Key Levers</div>
            <ul className="sr__lever-list">
              {rel.levers.map((l, i) => (
                <li key={i} className="sr__lever">
                  <div className="sr__lever-dot" style={{ background: l.color }} />
                  {l.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Risk Factors */}
          <div>
            <div className="sr__section-label">Risk Factors</div>
            <ul className="sr__lever-list">
              {rel.risks.map((r, i) => (
                <li key={i} className="sr__lever">
                  <div className="sr__lever-dot" style={{ background: r.color }} />
                  {r.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Affected Timelines */}
          <div>
            <div className="sr__section-label">Affected Timelines</div>
            {rel.timelines.map((tl, i) => (
              <div key={i} className="sr__tl-card">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                  <span className={`badge badge--${tl.badgeColor}`}>{tl.badge}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#6b7a90' }}>{tl.age}</span>
                </div>
                <div className="sr__tl-q">{tl.text}</div>
                <div className="sr__tl-bar">
                  <div className="sr__tl-track">
                    <div className="sr__tl-fill" style={{ width: `${tl.pct}%`, background: tl.color }} />
                  </div>
                  <span className="sr__tl-pct" style={{ color: tl.color }}>{tl.pct}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Shared Connections */}
          <div>
            <div className="sr__section-label">Shared Connections</div>
            {rel.shared.map((s, i) => (
              <div key={i} className="sr__shared-row">
                <div
                  className="sr__shared-avatar"
                  style={{
                    color:       s.color,
                    borderColor: `rgba(${hexToRgb(s.color)},0.3)`,
                  }}
                >
                  {s.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sr__shared-name">{s.name}</div>
                  <div className="sr__shared-type">{s.type}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Cascade Exposure */}
          <div>
            <div className="sr__section-label">Cascade Exposure</div>
            <div className="sr__details-grid">
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Total Exposed</div>
                <div className="sr__kv-val" style={{ color: '#e53935' }}>{rel.cascade.exposed}</div>
              </div>
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Sectors Affected</div>
                <div className="sr__kv-val">{rel.cascade.sectors}</div>
              </div>
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Countries</div>
                <div className="sr__kv-val">{rel.cascade.countries}</div>
              </div>
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Propagation</div>
                <div className="sr__kv-val" style={{ color: '#f5a623' }}>{rel.cascade.hops}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT: Entity B */}
      <CompactProfilePanel
        person={dataB}
        side="right"
        entityName={entityB.name}
        isLoading={loadingB}
        companies={trumpCompanies}
        connections={rightConnections}
        signals={trumpSignals}
        activeConnectionNodeId={entityA.nodeId}
      />

      {/* Bottom bar */}
      <div className="sr__bottom-bar">
        <span className="sr__bar-label">RELATION</span>
        <span className="sr__bar-value sr__bar-value--teal">
          {entityA.name.toUpperCase()} ↔ {entityB.name.toUpperCase()}
        </span>
        <div className="sr__bar-sep" />
        <span className="sr__bar-label">TYPE</span>
        <span className="sr__bar-value" style={{ color: '#00d4aa' }}>ALLIED</span>
        <div className="sr__bar-sep" />
        <span className="sr__bar-label">STRENGTH</span>
        <span className="sr__bar-value sr__bar-value--teal">{rel.strengthPct}%</span>
        <div className="sr__bar-sep" />
        <span className="sr__bar-label">RISK</span>
        <span className="sr__bar-value sr__bar-value--gold">{rel.riskScore}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <span className="sr__bar-live">
            <span className="sr__bar-live-dot" />
            LIVE
          </span>
          <span className="badge badge--green">3 TIMELINES</span>
        </div>
      </div>
    </div>
  )
}
