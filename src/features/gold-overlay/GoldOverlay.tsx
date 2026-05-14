import { useEffect } from 'react'
import { AppActor } from '@/app/AppProviders'
import { OverlayPanel } from '@/components/OverlayPanel/OverlayPanel'
import { PersonLeftPanel } from '@/features/person-overlay/PersonLeftPanel'
import { useEnrichedPerson } from '@/hooks/useEnrichedPerson'
import type { PersonMapDto } from '@/types/_ext/personMapDto'
import '@/features/person-overlay/person-overlay.scss'
import './gold-overlay.scss'

interface GoldOverlayProps {
  id: number
  nodeId: string
  seed: PersonMapDto | null
}

export function GoldOverlay({ id, seed }: GoldOverlayProps) {
  const appRef = AppActor.useActorRef()
  const handleClose = () => appRef.send({ type: 'CLOSE_OVERLAY' })

  // Notify the globe to draw arcs (no actual arc data yet — keeps the effect
  // contract alive for future arc integration without calling APIs).
  useEffect(() => {
    appRef.send({ type: 'PERSON_NETWORK_RESOLVED', personId: id, arcs: [] })
  }, [id, appRef])

  const { data: enriched } = useEnrichedPerson(id)
  const enrichedPerson = enriched?.person ?? null

  const netWorth   = enrichedPerson?.netWorthUsd     ?? seed?.netWorthUsd     ?? null
  const globalRank = enrichedPerson?.globalRank      ?? seed?.globalRank      ?? null
  const archetype  = enrichedPerson?.archetypeCode   ?? seed?.archetypeCode   ?? '—'
  const citizenship = enrichedPerson?.citizenship    ?? seed?.citizenship     ?? '—'
  const bornRaw    = enrichedPerson?.born            ?? seed?.born            ?? null
  const born       = bornRaw ? bornRaw.slice(0, 4) : '—'
  const entityName = enrichedPerson?.fullName ?? seed?.fullName ?? `Person #${id}`

  const demoCompanies = seed?.companyName
    ? [{ icon: seed.companyName.slice(0, 2).toUpperCase(), color: '#00e5ff', name: seed.companyName, role: '—', cap: '—' }]
    : []

  return (
    <div className="gov__root">
      {/* Left panel */}
      <OverlayPanel dir="left" delay={0} className="gov__panel-wrap">
        <button className="gov__close" onClick={handleClose}>×</button>
        <PersonLeftPanel
          person={seed ? {
            fullName:      enrichedPerson?.fullName ?? seed.fullName,
            title:         enrichedPerson?.title    ?? seed.title,
            photoUrl:      seed.photoUrl,
            archetypeCode: enrichedPerson?.archetypeCode ?? seed.archetypeCode,
          } as any : undefined}
          companies={demoCompanies}
          signals={enriched?.signals ?? []}
          entityName={entityName}
          isLoading={false}
        />
      </OverlayPanel>

      {/* Bottom panel */}
      <OverlayPanel dir="down" delay={0.16} className="gov__bottom">
        {/* Key Connections */}
        <div className="gov__bottom-section">
          <div className="pe__section-label">Key Connections</div>
          {(enriched?.connections.length ?? 0) === 0 ? (
            <div style={{ color: '#666', fontSize: 12 }}>—</div>
          ) : (
            enriched!.connections.map((c, i) => (
              <div key={i} className="gov__conn-row">
                <div className="gov__conn-initials" style={{ borderColor: c.color, color: c.color }}>
                  {c.initials}
                </div>
                <div className="gov__conn-body">
                  <div className="gov__conn-name">{c.name}</div>
                  <div className="gov__conn-role">{c.role}</div>
                </div>
                <div className="gov__conn-score" style={{ color: c.scoreColor }}>{c.score}</div>
              </div>
            ))
          )}
        </div>

        {/* Key Clients & Partners */}
        <div className="gov__bottom-section">
          <div className="pe__section-label">Key Clients &amp; Partners</div>
          {(enriched?.clientsPartners.length ?? 0) === 0 ? (
            <div style={{ color: '#666', fontSize: 12 }}>—</div>
          ) : (
            enriched!.clientsPartners.map((c, i) => (
              <div key={i} className="gov__conn-row">
                <div className="gov__conn-initials" style={{ borderColor: c.color, color: c.color }}>
                  {c.initials}
                </div>
                <div className="gov__conn-body">
                  <div className="gov__conn-name">{c.name}</div>
                  <div className="gov__conn-role">{c.role}</div>
                </div>
                <div className="gov__conn-score" style={{ color: c.scoreColor }}>{c.score}</div>
              </div>
            ))
          )}
        </div>

      </OverlayPanel>

      {/* Right panel — Key Data */}
      <OverlayPanel dir="right" delay={0.08} className="gov__right">
        <div className="pe__section-label">Key Data</div>
        <div className="pe__kv-grid">
          {netWorth != null && (
            <div className="pe__kv-cell">
              <div className="pe__kv-key">Net Worth</div>
              <div className="pe__kv-val" style={{ color: '#f5a623' }}>
                {`$${(netWorth / 1e9).toFixed(0)}B`}
              </div>
            </div>
          )}
          {globalRank != null && (
            <div className="pe__kv-cell">
              <div className="pe__kv-key">Global Rank</div>
              <div className="pe__kv-val" style={{ color: '#00e5ff' }}>
                {`#${globalRank}`}
              </div>
            </div>
          )}
          {archetype !== '—' && (
            <div className="pe__kv-cell">
              <div className="pe__kv-key">Archetype</div>
              <div className="pe__kv-val">{archetype}</div>
            </div>
          )}
          {citizenship !== '—' && (
            <div className="pe__kv-cell">
              <div className="pe__kv-key">Citizenship</div>
              <div className="pe__kv-val">{citizenship}</div>
            </div>
          )}
          {born !== '—' && (
            <div className="pe__kv-cell">
              <div className="pe__kv-key">Born</div>
              <div className="pe__kv-val">{born}</div>
            </div>
          )}
        </div>
      </OverlayPanel>
    </div>
  )
}
