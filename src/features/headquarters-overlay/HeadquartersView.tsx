// src/features/headquarters-overlay/HeadquartersView.tsx
//
// Dual-panel overlay shown when a globe click lands on a headquarters that
// hosts BOTH a CEO (person) and a company. 3-column layout cloned from
// StudioRelationView (.sr__root grid 260/1fr/260) so the visual language
// matches: left = person, center = relation context, right = company.

import { useQuery } from '@tanstack/react-query'
import { qk, fetchers } from '@/domain/queries'
import { OverlayPanel } from '@/components/OverlayPanel/OverlayPanel'
import { CompactProfilePanel } from '@/features/person-overlay/CompactProfilePanel'
import { toConnections, toSignals } from '@/features/person-overlay/adapters'
import { useCompanyById } from '@/hooks/useCompanyData'
import { usePersonCompanies } from '@/hooks/usePersonCompanies'
import { CompactCompanyPanel } from './CompactCompanyPanel'
import { HeadquartersCenter } from './HeadquartersCenter'
import '@/features/person-overlay/person-overlay.scss'

interface HeadquartersViewProps {
  personId:  number
  companyId: number
  onClose:   () => void
}

export function HeadquartersView({ personId, companyId, onClose }: HeadquartersViewProps) {
  const personNodeId  = `person:${personId}`
  const companyNodeId = `company:${companyId}`

  // ── LEFT: person intelligence ────────────────────────────────────────────
  const { data: person, isLoading: personLoading } = useQuery({
    queryKey: qk.person(personId),
    queryFn:  () => fetchers.person(personId),
    enabled:  personId > 0,
  })

  // ── RIGHT: company by id (existing hook) ─────────────────────────────────
  const { data: company, loading: companyLoading } = useCompanyById(companyId)

  // ── Edge role (CEO / Founder / …) — find the matching PersonCompany ───────
  const { data: personCompanies } = usePersonCompanies(personId)
  const edge = (personCompanies ?? []).find(c => c.companyId === companyId) ?? null
  const edgeRole = edge?.edgeLabel ?? edge?.edgeType ?? 'Affiliated'
  const edgeNote = `${person?.fullName ?? '…'} · ${company?.name ?? '…'}`

  // ── Left connections + signals (via existing adapters) ───────────────────
  const { data: personNeighbors } = useQuery({
    queryKey: qk.personNeighbors(personNodeId),
    queryFn:  () => fetchers.personNeighbors(personNodeId),
    enabled:  !!personNodeId,
  })
  const { data: personNews } = useQuery({
    queryKey: qk.entityNews(personNodeId, 10),
    queryFn:  () => fetchers.entityNews(personNodeId, 10),
    enabled:  !!personNodeId,
  })
  const leftConnections = toConnections(personNeighbors, personNodeId)
  const leftSignals     = toSignals(personNews)

  // ── Right top-persons (company neighbors filtered to PERSON) + signals ───
  const { data: companyNeighbors } = useQuery({
    queryKey: qk.companyNeighbors(companyNodeId),
    queryFn:  () => fetchers.companyNeighbors(companyNodeId),
    enabled:  !!companyNodeId,
  })
  const { data: companyNews } = useQuery({
    queryKey: qk.entityNews(companyNodeId, 10),
    queryFn:  () => fetchers.entityNews(companyNodeId, 10),
    enabled:  !!companyNodeId,
  })
  const rightTopPeople = toConnections(companyNeighbors, companyNodeId)
    .filter(c => c.nodeId.startsWith('person:'))
  const rightSignals   = toSignals(companyNews)

  return (
    <div className="sr__root">

      <button className="ov__close" onClick={onClose}>×</button>

      {/* LEFT — CEO (person) */}
      <OverlayPanel dir="left" delay={0} style={{ overflow: 'hidden' }}>
        <CompactProfilePanel
          person={person ?? null}
          side="left"
          entityName={person?.fullName ?? 'CEO'}
          isLoading={personLoading}
          companies={[]}
          connections={leftConnections}
          signals={leftSignals}
          activeConnectionNodeId={companyNodeId}
        />
      </OverlayPanel>

      {/* CENTER — Headquarters narrative */}
      <OverlayPanel dir="down" delay={0.06} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <HeadquartersCenter
          person={person ?? null}
          company={company ?? null}
          edgeRole={edgeRole}
          edgeNote={edgeNote}
        />
      </OverlayPanel>

      {/* RIGHT — Company */}
      <OverlayPanel dir="right" delay={0.12} style={{ overflow: 'hidden' }}>
        <CompactCompanyPanel
          company={company ?? null}
          side="right"
          entityName={company?.name ?? 'Company'}
          isLoading={companyLoading}
          edgeRole={edgeRole}
          topPersons={rightTopPeople}
          signals={rightSignals}
          activeConnectionNodeId={personNodeId}
        />
      </OverlayPanel>

    </div>
  )
}
