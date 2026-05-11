import type { ActorRefFrom } from 'xstate'
import { useQuery } from '@tanstack/react-query'
import type { EntityRef } from '@/domain/types'
import type { entityInspectorMachine } from '@/machines/entity-inspector.machine'
import { qk, fetchers } from '@/domain/queries'
import { CompactProfilePanel } from './CompactProfilePanel'
import { toConnections, toSignals } from './adapters'
import {
  elonMuskFallback,
  donaldTrumpFallback,
  elonMuskCompanies,
  trumpCompanies,
  elonTrumpRelation,
} from './personFallbackData'
import './person-overlay.scss'

const MUSK_NODE_ID  = 'person:7'
const TRUMP_NODE_ID = 'person:173'

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(',')
}

interface StudioRelationViewProps {
  entityA:      EntityRef
  entityB:      EntityRef
  /** Optional: when present, the "Back" button sends RELATION.CLOSE to the
   * machine. When absent (e.g. mounted as a top-level page from PersonViewPanel),
   * the back button falls through to onClose. */
  inspectorRef?: ActorRefFrom<typeof entityInspectorMachine>
  onClose:      () => void
}

export function StudioRelationView({
  entityA,
  entityB,
  inspectorRef,
  onClose,
}: StudioRelationViewProps) {

  // ── Person intelligence (left + right panels) ────────────────────────────
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

  // ── Connections (graph neighbors) ─────────────────────────────────────────
  const { data: neighborsA } = useQuery({
    queryKey: qk.personNeighbors(entityA.nodeId),
    queryFn:  () => fetchers.personNeighbors(entityA.nodeId),
    enabled:  !!entityA.nodeId,
  })
  const { data: neighborsB } = useQuery({
    queryKey: qk.personNeighbors(entityB.nodeId),
    queryFn:  () => fetchers.personNeighbors(entityB.nodeId),
    enabled:  !!entityB.nodeId,
  })

  // ── Signals (entity news) ─────────────────────────────────────────────────
  const { data: newsA } = useQuery({
    queryKey: qk.entityNews(entityA.nodeId, 10),
    queryFn:  () => fetchers.entityNews(entityA.nodeId, 10),
    enabled:  !!entityA.nodeId,
  })
  const { data: newsB } = useQuery({
    queryKey: qk.entityNews(entityB.nodeId, 10),
    queryFn:  () => fetchers.entityNews(entityB.nodeId, 10),
    enabled:  !!entityB.nodeId,
  })

  // ── Relation analysis (graceful fallback for Musk↔Trump only) ────────────
  const isMuskTrumpPair =
    (entityA.nodeId === MUSK_NODE_ID  && entityB.nodeId === TRUMP_NODE_ID) ||
    (entityA.nodeId === TRUMP_NODE_ID && entityB.nodeId === MUSK_NODE_ID)

  const { data: relationApi, isError: relationError } = useQuery({
    queryKey: qk.relation(entityA.nodeId, entityB.nodeId),
    queryFn:  () => fetchers.relation(entityA.nodeId, entityB.nodeId),
    enabled:  !!entityA.nodeId && !!entityB.nodeId,
    retry:    false,
  })

  const handleBack = () => {
    if (inspectorRef) inspectorRef.send({ type: 'RELATION.CLOSE' })
    else onClose()
  }

  // Person fallbacks (Musk/Trump fixtures only when API misses)
  const dataA = personA ?? (entityA.id === 7   ? elonMuskFallback    : null)
  const dataB = personB ?? (entityB.id === 173 ? donaldTrumpFallback : null)

  // Relation: real `RelationAnalysis` shape (description / powerDynamic / keyLevers /
  // riskFactors / strength / riskScore) does NOT include timelines / shared / cascade —
  // those view-only sections fall back to the demo fixture for the Musk↔Trump pair
  // and are hidden otherwise. Backend support for timelines/shared/cascade pending.
  const useFallbackRelation = isMuskTrumpPair && (!relationApi || relationError)
  const rel = useFallbackRelation ? elonTrumpRelation : null
  const apiAnalysis    = relationApi?.description  ?? rel?.analysis     ?? null
  const apiPowerDyn    = relationApi?.powerDynamic ?? rel?.powerDynamic ?? null
  const apiLevers      = relationApi?.keyLevers   ?? rel?.levers.map(l => l.text) ?? []
  const apiRisks       = relationApi?.riskFactors ?? rel?.risks.map(r => r.text)  ?? []
  const strengthPct    = relationApi
    ? Math.round((relationApi.strength ?? 0) * 100)
    : (rel?.strengthPct ?? 0)
  const score          = relationApi
    ? Number((relationApi.strength * 10).toFixed(1))
    : (rel?.score ?? 0)
  const riskScore      = relationApi?.riskScore ?? rel?.riskScore ?? 0
  const relationType   = (relationApi?.relationType ?? rel?.type ?? 'RELATED').toString().toUpperCase()
  const severity       = rel?.severity ?? 'MEDIUM'

  // Photos for arc avatars
  const photoA = dataA?.photoUrl ?? null
  const photoB = dataB?.photoUrl ?? null
  const initialsA = entityA.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const initialsB = entityB.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // Connections: live data via adapter; fallback to fixtures for Musk/Trump only
  const liveConnA = toConnections(neighborsA, entityA.nodeId)
  const liveConnB = toConnections(neighborsB, entityB.nodeId)
  const leftConnections  = liveConnA.length > 0 ? liveConnA : (entityA.id === 7   ? [] : [])
  const rightConnections = liveConnB.length > 0 ? liveConnB : (entityB.id === 173 ? [] : [])

  // Signals: live data via adapter; empty array if endpoint unavailable
  const leftSignals  = toSignals(newsA)
  const rightSignals = toSignals(newsB)

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
        companies={entityA.id === 7 ? elonMuskCompanies : []}
        connections={leftConnections}
        signals={leftSignals}
        activeConnectionNodeId={entityB.nodeId}
      />

      {/* CENTER: Studio Relation */}
      <div className="sr__center">

        {/* Header */}
        <div className="sr__header">
          <div className="sr__kicker">Studio Relation</div>
          <div className="sr__label">{relationType}</div>
          <div className="sr__type" style={{ color: '#00d4aa' }}>
            Strength {strengthPct}%
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
              <span className="sr__str-val" style={{ color: '#00d4aa' }}>{score || '—'}</span>
            </div>
            <div className="sr__str-track">
              <div
                className="sr__str-fill"
                style={{
                  width:      `${strengthPct}%`,
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
                <div className="sr__kv-val" style={{ color: '#00d4aa' }}>{relationType}</div>
              </div>
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Risk Score</div>
                <div className="sr__kv-val" style={{ color: '#f5a623' }}>{riskScore} / 5</div>
              </div>
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Linked Timelines</div>
                <div className="sr__kv-val" style={{ color: '#a855f7' }}>{rel?.timelines.length ?? 0}</div>
              </div>
              <div className="sr__kv-cell">
                <div className="sr__kv-key">Severity</div>
                <div className="sr__kv-val" style={{ color: '#f5a623' }}>{severity}</div>
              </div>
            </div>
          </div>

          {/* Relation Analysis */}
          {apiAnalysis && (
            <div>
              <div className="sr__section-label">Relation Analysis</div>
              <div className="sr__analysis-desc">{apiAnalysis}</div>
            </div>
          )}

          {/* Power Dynamic */}
          {apiPowerDyn && (
            <div>
              <div className="sr__section-label">Power Dynamic</div>
              <div className="sr__power-dyn">{apiPowerDyn}</div>
            </div>
          )}

          {/* Key Levers */}
          {apiLevers.length > 0 && (
            <div>
              <div className="sr__section-label">Key Levers</div>
              <ul className="sr__lever-list">
                {apiLevers.map((text, i) => (
                  <li key={i} className="sr__lever">
                    <div className="sr__lever-dot" style={{ background: '#00e5ff' }} />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Factors */}
          {apiRisks.length > 0 && (
            <div>
              <div className="sr__section-label">Risk Factors</div>
              <ul className="sr__lever-list">
                {apiRisks.map((text, i) => (
                  <li key={i} className="sr__lever">
                    <div className="sr__lever-dot" style={{ background: '#e53935' }} />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Empty-state when no analysis available (non-Musk-Trump pair, endpoint missing) */}
          {!apiAnalysis && !apiPowerDyn && apiLevers.length === 0 && apiRisks.length === 0 && (
            <div className="sr__analysis-desc" style={{ color: '#7a8ba0' }}>
              Relation analysis pending — backend `/relations/analyze` not yet available for this pair.
            </div>
          )}

          {/* Affected Timelines (fallback-only — no API endpoint yet) */}
          {rel && (
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
          )}

          {/* Shared Connections (fallback-only — derive from neighbors intersection later) */}
          {rel && (
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
          )}

          {/* Cascade Exposure (fallback-only) */}
          {rel && (
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
          )}

        </div>
      </div>

      {/* RIGHT: Entity B */}
      <CompactProfilePanel
        person={dataB}
        side="right"
        entityName={entityB.name}
        isLoading={loadingB}
        companies={entityB.id === 173 ? trumpCompanies : []}
        connections={rightConnections}
        signals={rightSignals}
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
        <span className="sr__bar-value" style={{ color: '#00d4aa' }}>{relationType}</span>
        <div className="sr__bar-sep" />
        <span className="sr__bar-label">STRENGTH</span>
        <span className="sr__bar-value sr__bar-value--teal">{strengthPct}%</span>
        <div className="sr__bar-sep" />
        <span className="sr__bar-label">RISK</span>
        <span className="sr__bar-value sr__bar-value--gold">{riskScore}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <span className="sr__bar-live">
            <span className="sr__bar-live-dot" />
            LIVE
          </span>
          {rel && <span className="badge badge--green">{rel.timelines.length} TIMELINES</span>}
        </div>
      </div>
    </div>
  )
}
