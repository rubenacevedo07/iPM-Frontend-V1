import { apiGet } from './api'
import type {
  PersonIntelligence, CompanyIntelligence, NeighborsResponse,
  Signal, RelationAnalysis,
  MarketDataCacheDto, MarketSymbolDto, CompositeIndexDto, RelationArcDto,
  CountryRiskSummaryDto,
  CompanyProvider, CompanyOwnershipHolder, CompanyTimeline, CompanyPerson,
  CompanyClient, CompanyFacility, CompanyProductLine, CompanySector,
  CompanyCommodity,
  PowerRankingDto, ActiveTimelineDto,
} from './types'

// ── Backend shapes (not exported) ──────────────────────────────────────────────

interface PersonPowerIndexRow {
  personId:       number
  compositeScore: number
  globalRank:     number | null
  archetypeCode:  string
  person?: {
    id:       number
    name:     string | null
    lastName: string | null
    title:    string | null
    photo:    string | null
  }
}

interface TimelineFeedItemRow {
  id:              string
  name:            string
  divergenceType:  string | null
  branchAProb:     number | null
  entities?: Array<{
    entityLabel: string
    isPrimary:   boolean
  }>
}

// ── Query Key Factories ──
export const qk = {
  person: (id: number) => ['person', id] as const,
  personNeighbors: (nodeId: string) => ['person', 'neighbors', nodeId] as const,
  company: (id: number) => ['company', id] as const,
  companyIntelligence: (id: number) => ['company', 'intelligence', id] as const,
  companyNeighbors: (nodeId: string) => ['company', 'neighbors', nodeId] as const,
  entityNews: (nodeId: string, limit: number) => ['news', nodeId, limit] as const,
  relation: (sourceNodeId: string, targetNodeId: string) => ['relation', sourceNodeId, targetNodeId] as const,
  compositeIndices: () => ['compositeIndices'] as const,
  search: (query: string) => ['search', query] as const,
  marketLatest:  () => ['market', 'latest'] as const,
  marketSymbols: () => ['market', 'symbols'] as const,
  compositeIdx:  () => ['composite', 'indexes'] as const,
  relationArcs:  (limit: number) => ['relation', 'arcs', limit] as const,
  countryRisk:   () => ['country', 'risk'] as const,
  companyProviders:   (id: number) => ['company', 'providers', id]   as const,
  companyClients:     (id: number) => ['company', 'clients', id]     as const,
  companyFacilities:  (id: number) => ['company', 'facilities', id]  as const,
  companyProducts:    (id: number) => ['company', 'products', id]    as const,
  companySectors:     (id: number) => ['company', 'sectors', id]     as const,
  companyOwnership:   (id: number) => ['company', 'ownership', id]   as const,
  companyTimelines:   (nodeId: string) => ['company', 'timelines', nodeId] as const,
  companyPersons:     (id: number) => ['company', 'persons', id]     as const,
  companyCommodities: (id: number) => ['company', 'commodities', id] as const,
  powerRanking:       () => ['persons', 'power-ranking']              as const,
  activeTimelines:    () => ['timelines', 'active']                   as const,
} as const

// ── Fetcher Functions ──
export const fetchers = {
  person: (id: number) =>
    apiGet<PersonIntelligence>(`/persons/${id}/intelligence`),

  personNeighbors: (nodeId: string) =>
    apiGet<NeighborsResponse>(`/graph/node/${encodeURIComponent(nodeId)}/neighbors`),

  company: (id: number) =>
    apiGet<CompanyIntelligence>(`/companies/${id}`),

  // /companies/{id}/intelligence doesn't exist — fall back to base company endpoint
  companyIntelligence: (id: number) =>
    apiGet<CompanyIntelligence>(`/companies/${id}`),

  companyNeighbors: (nodeId: string) =>
    apiGet<NeighborsResponse>(`/graph/node/${encodeURIComponent(nodeId)}/neighbors`),

  entityNews: (nodeId: string, limit = 10) =>
    apiGet<Signal[]>(`/news/entity/${encodeURIComponent(nodeId)}?limit=${limit}`),

  relation: (sourceNodeId: string, targetNodeId: string) =>
    apiGet<RelationAnalysis>(`/relations/analyze?source=${encodeURIComponent(sourceNodeId)}&target=${encodeURIComponent(targetNodeId)}`),

  search: (query: string) =>
    apiGet<Array<{ nodeId: string; name: string; type: string; score: number }>>(`/search?q=${encodeURIComponent(query)}`),

  marketLatest: async (): Promise<MarketDataCacheDto[]> => {
    interface RawMarket {
      symbol: string; price: number; changeAbs: number | null
      changePct: number | null; isDelayed: boolean; fetchedAt: string
    }
    // Label lookup for known symbols
    const LABELS: Record<string, { label: string; dataNodeType: string }> = {
      AAPL:   { label: 'Apple',    dataNodeType: 'Equity'      },
      MSFT:   { label: 'Microsoft',dataNodeType: 'Equity'      },
      NVDA:   { label: 'NVIDIA',   dataNodeType: 'Equity'      },
      TSLA:   { label: 'Tesla',    dataNodeType: 'Equity'      },
      GOOGL:  { label: 'Alphabet', dataNodeType: 'Equity'      },
      META:   { label: 'Meta',     dataNodeType: 'Equity'      },
      BTC:    { label: 'Bitcoin',  dataNodeType: 'CryptoPrice' },
      ETH:    { label: 'Ethereum', dataNodeType: 'CryptoPrice' },
      GOLD:   { label: 'Gold',     dataNodeType: 'Commodity'   },
      BRENT:  { label: 'Brent',    dataNodeType: 'Commodity'   },
      NATGAS: { label: 'Nat Gas',  dataNodeType: 'Commodity'   },
      SPX:    { label: 'S&P 500',  dataNodeType: 'MarketIndex' },
      VIX:    { label: 'VIX',      dataNodeType: 'MarketIndex' },
      DAX:    { label: 'DAX',      dataNodeType: 'MarketIndex' },
      EURUSD: { label: 'EUR/USD',  dataNodeType: 'FxRate'      },
      GBPUSD: { label: 'GBP/USD',  dataNodeType: 'FxRate'      },
      CNYUSD: { label: 'CNY/USD',  dataNodeType: 'FxRate'      },
    }
    const rows = await apiGet<RawMarket[]>('/market-data/latest')
    return rows.map(r => ({
      symbol:       r.symbol,
      label:        LABELS[r.symbol]?.label        ?? r.symbol,
      price:        r.price,
      changePct:    r.changePct,
      changeAbs:    r.changeAbs,
      updatedAt:    r.fetchedAt ?? '',
      isDelayed:    r.isDelayed ?? true,
      dataNodeType: LABELS[r.symbol]?.dataNodeType ?? 'Equity',
    }))
  },

  marketSymbols: () =>
    apiGet<MarketSymbolDto[]>('/market/symbols'),

  compositeIdx: () =>
    apiGet<CompositeIndexDto[]>('/risk-index/composite'),

  relationArcs: (limit = 60) =>
    apiGet<RelationArcDto[]>(`/graph/edges/top?limit=${limit}`),

  countryRisk: () =>
    apiGet<CountryRiskSummaryDto[]>('/countries/risk-summary'),

  companyProviders: (id: number) =>
    apiGet<CompanyProvider[]>(`/company-providers/company/${id}`),

  companyClients: (id: number) =>
    apiGet<CompanyClient[]>(`/company-clients/company/${id}`),

  companyFacilities: (id: number) =>
    apiGet<CompanyFacility[]>(`/company-fabrics/company/${id}`),

  companyProducts: (id: number) =>
    apiGet<CompanyProductLine[]>(`/company-products/company/${id}`),

  companySectors: (id: number) =>
    apiGet<CompanySector[]>(`/company-sectors/company/${id}`),

  // No ownership endpoint exists — returns empty so callers use fallback
  companyOwnership: (_id: number) =>
    Promise.resolve([] as CompanyOwnershipHolder[]),

  companyTimelines: (nodeId: string) =>
    apiGet<CompanyTimeline[]>(`/timelines/by-entity?nodeId=${encodeURIComponent(nodeId)}`),

  // No company/persons sub-route exists — returns empty so callers use fallback
  companyPersons: (_id: number) =>
    Promise.resolve([] as CompanyPerson[]),

  companyCommodities: (id: number) =>
    apiGet<CompanyCommodity[]>(`/company-commodities/company/${id}`),

  powerRanking: async (): Promise<PowerRankingDto[]> => {
    const rows = await apiGet<PersonPowerIndexRow[]>('/power/global-ranking?limit=5')
    return rows.map(r => ({
      personId:       r.personId,
      fullName:       [r.person?.name, r.person?.lastName].filter(Boolean).join(' ') || `Person ${r.personId}`,
      title:          r.person?.title ?? null,
      archetypeCode:  r.archetypeCode,
      compositeScore: Math.round(Number(r.compositeScore)),
      globalRank:     r.globalRank ?? 0,
      photoUrl:       r.person?.photo ?? null,
      nodeId:         `person:${r.personId}`,
      slug:           (r.person?.name ?? `person-${r.personId}`)
                        .toLowerCase().replace(/\s+/g, '-'),
    }))
  },

  activeTimelines: async (): Promise<ActiveTimelineDto[]> => {
    const rows = await apiGet<TimelineFeedItemRow[]>('/Timelines/featured?limit=3')
    return rows.slice(0, 3).map(r => ({
      id:             r.id,
      question:       r.name,
      probA:          r.branchAProb != null ? r.branchAProb / 100 : 0.5,
      divergenceType: r.divergenceType ?? 'Unknown',
      entityName:     r.entities?.find(e => e.isPrimary)?.entityLabel ?? null,
    }))
  },
}
