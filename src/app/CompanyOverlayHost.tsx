import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { OverlayPanel } from '@/components/OverlayPanel/OverlayPanel'
import { AppActor } from './app.machine'
import { useUIState } from './useUIState'
import { getOverlay } from './selectUIState'

import CompanyHeaderRow from '@/features/company-overlay/globalCompanies/CompanyHeaderRow'
import CompanySubHeaderRow from '@/features/company-overlay/globalCompanies/CompanySubHeaderRow'
import FirstPanel from '@/features/company-overlay/globalCompanies/FirstPanel'
import SecondPanel from '@/features/company-overlay/globalCompanies/SecondPanel'
import type { NavTab } from '@/features/company-overlay/globalCompanies/shared'

import {
  useCompanyById,
  useCompanySectors,
  useCompanyMarkets,
  useCompanyFabrics,
  useCompanyProducts,
  useCompanyProviders,
  useCompanyClients,
} from '@/hooks/useCompanyData'
import { useCompanies } from '@/hooks/useCompanies'
import { mapCompanyNetworkToArcs } from '@/services/companyNetworkMapper'
import { CompanyGlobe } from '@/components/CompanyGlobe'
import type { Company } from '@/types/company'

export function CompanyOverlayHost() {
  const actor = AppActor.useActorRef()
  const ui    = useUIState()

  // Day 3: read the overlay payload from the discriminated union. The host
  // ALWAYS calls every React-Query hook below (even when narrowing fails)
  // because hooks must stay in the same order across renders; `fetchId = 0`
  // is the documented no-op id for these hooks. The early-return guards
  // below short-circuit the JSX before the data is consumed.
  const overlay = getOverlay(ui)
  const id = overlay?.kind === 'company' ? overlay.id : null
  const fetchId = id ?? 0

  const { data: company, loading, error } = useCompanyById(fetchId)
  const { data: sectorsData } = useCompanySectors(fetchId)
  const { data: marketsData } = useCompanyMarkets(fetchId)
  const { data: fabricsData } = useCompanyFabrics(fetchId)
  const { data: productsData } = useCompanyProducts(fetchId)
  const { data: providersData, loading: providersLoading } = useCompanyProviders(fetchId)
  const { data: clientsData,   loading: clientsLoading   } = useCompanyClients(fetchId)
  const { companies } = useCompanies()

  const [activeTab, setActiveTab] = useState<NavTab>('Overview')

  const companyById = useMemo(() => {
    const m: Record<number, Company> = {}
    companies.forEach(c => { m[c.id] = c })
    return m
  }, [companies])

  // Phase 8: when provider + client fetches have settled, push EngineArc[] into
  // app.machine (stale-id guard + CMD.SET_ARCS to GlobeBridge). TanStack-style
  // dedup is the hook layer; the machine still validates companyId.
  useEffect(() => {
    if (id == null) return
    if (loading || error || !company) return
    if (company.id !== id) return
    if (providersLoading || clientsLoading) return
    const arcs = mapCompanyNetworkToArcs({
      focalCompany: company,
      providers: providersData ?? [],
      clients:   clientsData ?? [],
      companyById,
    })
    actor.send({ type: 'NETWORK_RESOLVED', companyId: id, arcs })
  }, [
    actor,
    id,
    company,
    loading,
    error,
    providersData,
    clientsData,
    providersLoading,
    clientsLoading,
    companyById,
  ])

  const clients = useMemo(() => {
    return (clientsData ?? [])
      .filter(c => c.clientId != null && c.clientName != null && c.contractValue != null)
      .map(c => ({
        id:            c.id,
        clientId:      c.clientId as number,
        clientName:    c.clientName as string,
        contractValue: c.contractValue as number,
      }))
  }, [clientsData])

  if (id == null) return null
  if (error) return null

  // Day 4+: SkeletonPanels removed at user request. The loading branch used to
  // render `<CompanyOverlaySkeleton />` (a full-viewport shimmer overlay) while
  // React Query resolved the company + its slices; the skeleton's full-width
  // dark header/footer bands were read as a persistent "shadow" behind the
  // panels, and removing them resolved the last visual regression. Now the
  // host renders nothing until `isReady` — the overlay simply pops in once the
  // company id matches the URL id, which on a warm cache is sub-frame and on
  // a cold fetch is ~100-300 ms of empty space over the globe. If we ever
  // want a loading hint back, do it as a tiny inline element (NOT a full
  // overlay) so it can't read as a backdrop.
  const isReady = !loading && !!company && company.id === id

  const handleClose = () => actor.send({ type: 'CLOSE_OVERLAY' })

  if (!isReady) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 10, right: 14,
          zIndex: 70,
          cursor: 'pointer',
          width: 28, height: 28,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 16,
          lineHeight: 1,
          pointerEvents: 'auto',
        }}
      >
        ×
      </div>

      <ReadyContent
        company={company!}
        sectorsData={sectorsData}
        marketsData={marketsData}
        fabricsData={fabricsData}
        productsData={productsData}
        providersData={providersData}
        clients={clients}
        companyById={companyById}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  )
}

// Extracted so the company-non-null narrowing is local to where it's needed
// (the skeleton branch above doesn't have access to the loaded company). All
// panels render with `?? []` for the optional payload arrays — each slice
// progressively fills as its hook resolves, no extra Suspense boundary needed.
interface ReadyContentProps {
  company:       Company
  sectorsData:   ReturnType<typeof useCompanySectors>['data']
  marketsData:   ReturnType<typeof useCompanyMarkets>['data']
  fabricsData:   ReturnType<typeof useCompanyFabrics>['data']
  productsData:  ReturnType<typeof useCompanyProducts>['data']
  providersData: ReturnType<typeof useCompanyProviders>['data']
  clients:       { id: number; clientId: number; clientName: string; contractValue: number }[]
  companyById:   Record<number, Company>
  activeTab:     NavTab
  setActiveTab:  (t: NavTab) => void
}

function ReadyContent({
  company,
  sectorsData,
  marketsData,
  fabricsData,
  productsData,
  providersData,
  clients,
  companyById,
  activeTab,
  setActiveTab,
}: ReadyContentProps) {
  return (
    <>
      {/* Globe data-feeder: syncs market continents + fabric positions to the bridge */}
      <CompanyGlobe
        companyId={company.id}
        latitude={company.latitude}
        longitude={company.longitude}
        markets={marketsData ?? []}
        fabrics={fabricsData ?? []}
      />

      {/* Click pass-through pattern (same as GoldOverlay .gov__root → .gov__*):
          each OverlayPanel wrapper is `position: absolute; inset: 0` so framer
          can animate from outside the viewport, but the wrapper itself is
          `pointer-events: none`. The visible content inside each panel
          (`.co-hdr`, `.co-sub`, `.co-first`, SecondPanel's inline root) is
          absolutely positioned to a specific region and is the only thing that
          captures clicks. Without this, the wrappers tile four full-viewport
          hit-targets over deck.gl and block every globe pick after the overlay
          opens. */}
      <AnimatePresence>
        <OverlayPanel key={`header-wrap-${company.id}`} dir="up" delay={0} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <CompanyHeaderRow
            company={company}
            sectors={sectorsData ?? []}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </OverlayPanel>

        <OverlayPanel key={`sub-${company.id}`} dir="up" delay={0.06} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <CompanySubHeaderRow
            company={company}
          />
        </OverlayPanel>

        <OverlayPanel key={`first-${company.id}-${activeTab}`} dir="left" delay={0.1} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <FirstPanel
            activeTab={activeTab}
            markets={marketsData ?? []}
            fabrics={fabricsData ?? []}
            products={productsData ?? []}
          />
        </OverlayPanel>

        <OverlayPanel key={`second-${company.id}-${activeTab}`} dir="right" delay={0.1} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <SecondPanel
            activeTab={activeTab}
            providers={providersData ?? []}
            clients={clients}
            companyById={companyById}
          />
        </OverlayPanel>
      </AnimatePresence>
    </>
  )
}
