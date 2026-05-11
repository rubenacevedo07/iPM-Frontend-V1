import { useEffect, useMemo, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { AppActor } from './app.machine'

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
  const search = useSearch({ from: '/workstation' })

  const isCompany = search.overlay === 'company'
  const id = typeof search.id === 'number' ? search.id : null
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
    if (!isCompany || id == null) return
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
    isCompany,
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

  if (!isCompany || id == null) return null
  if (loading || error || !company) return null

  const handleClose = () => actor.send({ type: 'CLOSE_OVERLAY' })

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

      {/* Globe data-feeder: syncs market continents + fabric positions to the bridge */}
      <CompanyGlobe
        companyId={company.id}
        latitude={company.latitude}
        longitude={company.longitude}
        markets={marketsData ?? []}
        fabrics={fabricsData ?? []}
      />

      <AnimatePresence>
        {/* HeaderRow needs clicks (nav tabs) — V1-host wrapper restores pointerEvents */}
        <div key={`header-wrap-${company.id}`} style={{ pointerEvents: 'auto' }}>
          <CompanyHeaderRow
            company={company}
            sectors={sectorsData ?? []}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
        <CompanySubHeaderRow
          key={`sub-${company.id}`}
          company={company}
        />
        <FirstPanel
          key={`first-${company.id}-${activeTab}`}
          activeTab={activeTab}
          markets={marketsData ?? []}
          fabrics={fabricsData ?? []}
          products={productsData ?? []}
        />
        <SecondPanel
          key={`second-${company.id}-${activeTab}`}
          activeTab={activeTab}
          providers={providersData ?? []}
          clients={clients}
          companyById={companyById}
        />
      </AnimatePresence>
    </div>
  )
}
