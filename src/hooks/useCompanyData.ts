/**
 * useCompanyData.ts — Data hooks & types for CompanyEntityPage
 *
 * ALL hooks call real services from the codebase.
 * Stubs with mock data ONLY for the 3 new endpoints that need
 * backend work (Timelines, NewsEvents, EdgeRiskScore by nodeId).
 *
 * Graph hooks are re-exported from hooks/useGraph — no duplication.
 *
 * Node ID convention (confirmed from GraphController.cs comment):
 *   company:{id}  e.g. "company:42"
 *   country:{id}  e.g. "country:158"
 *   person:{id}   e.g. "person:7"
 *
 * Strength type note (GraphEdge.strength is a categorical string label):
 *   'Critical' | 'High' | 'Medium' | 'Low'  — confirmed from real DB SQL dump.
 *   Use edgeWidth(edge) below everywhere instead of numeric conversion.
 */

import { useState, useEffect } from 'react';

// ── Re-export graph hooks (already production-ready) ──────────────────────
export {
  useGraphNode,
  useSubgraph,
  useGraphEdges,
  useGraphNeighbors,
  useGraphDegree,
  useEdgeTimelines,
  useGraphSearch,
  useTopNodes,
} from '@/hooks/useGraph';

export type {
  GraphNodeDetailDto,
  SubgraphDto,
  GraphEdgeDto,
  GraphNodeDto,
  GraphNodeDegreeDto,
  GraphEdgeWithTimelineDto,
  TopNodeDto,
} from '@/types/graph';

// ── Canonical AssetManagerCompanyFull (nested shape matches backend)
import type { AssetManagerCompanyFull } from '@/types/assetManagerCompany';
export type { AssetManagerCompanyFull };

// ── Services (all real, from src/services/) ───────────────────────────────
import { companyService }             from '@/services/companyService';
import { companyProductService }      from '@/services/companyProductService';
import { companyFabricService }       from '@/services/companyFabricService';
import { companyMarketsService }      from '@/services/companyMarketsService';
import { companyClientSimpleService } from '@/services/companyClientSimpleService';
import { companyProviderService }     from '@/services/companyProviderService';
import { companyCommodityService }    from '@/services/companyCommodityService';
import { companySectorService }       from '@/services/companySectorService';
import { assetManagerCompanyService } from '@/services/assetManagerCompanyService';
import { alphaEarningsService }       from '@/services/alphaEarningsService';
import { cashFlowService }            from '@/services/alphaCashFlowService';
import { companyIntelligenceService } from '@/services/companyIntelligenceService';

// ── Types from codebase ───────────────────────────────────────────────────

export interface Company {
  id: number;
  name: string;
  category: string;
  country: string;
  founders: string[];
  ceo: string;
  logo: string;
  marketCapUsd: number;
  revenueUsd?: number | null;
  netIncomeUsd?: number | null;
  equityUsd?: number | null;
  headquarters: string;
  latitude: number;
  longitude: number;
  lastUpdated?: string;
  market?: string | null;
  employees?: number | null;
  regionId?: number;
  ticker?: string | null;
  // Intelligence fields
  description?: string | null;
  aiNarrative?: string | null;
  isChokepoint?: boolean | null;
  softDependencyScore?: number | null;
  founded?: number | null;
  systemicImportanceLevel?: string | null;
  substitutionLatencyMonths?: number | null;
}

export interface CompanyPersonSummary {
  id: number;
  fullName: string;
  title?: string | null;
  photoUrl?: string | null;
  companyName?: string | null;
}

export interface CompanyProduct {
  id:                  number;
  companyId:           number;
  productName:         string;
  sku:                 string;
  productDescription:  string;
}

export interface CompanyFabric {
  id: number;
  companyId: number;
  name: string;
  country: string;
  city: string;
  employees: number;
  description: string;
}

export interface CompanyMarket {
  id: number;
  companyId: number;
  countryContinent: string;
  description: string;
  company: null;
}

/**
 * CompanyClientSimple — flat response from GET /api/CompanyClients/company/{id}
 * Backend contract (verified 2026-04-18, after backend commit 801d352):
 *   { id, companyId, clientId, clientName, contractValue, description }
 */
export interface CompanyClientSimple {
  id:             number;
  companyId:      number;
  clientId:       number | null;
  clientName:     string | null;
  contractValue:  number | null;
  description:    string | null;
}

/**
 * CompanyProvider — GET /api/CompanyProviders/company/{id} returns the entity
 * with .Include(Provider), so the nested provider holds the full Company.
 * Verified against backend 2026-04-18.
 */
export interface CompanyProvider {
  id:            number;
  companyId:     number;
  providerId:    number;
  serviceType:   string | null;
  category:      string | null;
  contractValue: number | null;
  description:   string | null;
  company:       null;
  provider:      { id: number; name: string; country?: string; logo?: string | null } | null;
}

export interface CompanyInCommodity {
  id: number;
  name: string;
  country: string;
  logo: string | null;
  latitude?: number;
  longitude?: number;
  headquarters?: string;
}

export interface CompanyCommodity {
  companyId: number;
  company: CompanyInCommodity | null;
  commodityId: number;
  commodityName: string;
  dependencyLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  exposurePercentage: number;
  contractType: string;
  notes: string;
}

export interface CompanySector {
  id: number;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  isPrimary?: boolean;
}

export interface CommodityBreakdownItem {
  commodityId: number;
  commodityName: string;
  category: string;
  dependencyLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  exposurePercentage: number;
  substitutionRisk: 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low';
  riskContribution: number;
}

/**
 * CompanyRiskProfile — GET /api/CompanyRiskProfile/company/{id}
 * Verified against backend 2026-04-18 (commit 801d352).
 * Scales: overallRiskScore and concentrationRisk are 0-10 (NOT 0-100).
 * companyName + commodityBreakdown stay optional for other legacy consumers
 * that rely on the broader shape; new endpoint does not populate them.
 */
export interface CompanyRiskProfile {
  companyId:               number;
  overallRiskScore:        number;
  riskTier:                'Critical' | 'High' | 'Medium' | 'Low' | 'Unknown';
  concentrationRisk:       number;
  criticalDependencies:    number;
  highDependencies:        number;
  totalCommodities:        number;
  totalProviders:          number;
  avgSustainabilityScore:  number | null;
  companyName?:            string;
  commodityBreakdown?:     CommodityBreakdownItem[];
}

/**
 * CompanyOci — Ownership Concentration Index.
 * Confirm from src/types/assetManagerCompany.ts.
 */
export interface CompanyOci {
  companyId: number;
  ociScore: number;           // 0–100
  top5OwnershipPct: number;   // % held by top 5 asset managers
  top10OwnershipPct?: number;
  institutionalPct?: number;
  totalHolders?: number;
}

// ── Alpha Vantage types ───────────────────────────────────────────────────

export interface QuarterlyEarning {
  fiscalDateEnding: string;
  reportedDate?: string;
  reportedEPS: string;        // Alpha Vantage returns strings
  estimatedEPS: string;
  surprise: string;
  surprisePercentage: string;
}

export interface EarningsResponse {
  symbol: string;
  annualEarnings?: unknown[];
  quarterlyEarnings: QuarterlyEarning[];
}

export interface QuarterlyCashFlow {
  fiscalDateEnding: string;
  reportedCurrency?: string;
  operatingCashflow: string;
  capitalExpenditures: string;
  freeCashFlow?: string;       // may be computed client-side: operating - capex
  dividendPayout?: string;
  netIncome?: string;
}

export interface CashFlowResponse {
  symbol: string;
  annualReports?: unknown[];
  quarterlyReports: QuarterlyCashFlow[];
}

// ── New endpoint types (stubs — backend TODO) ─────────────────────────────

export type DivergenceType =
  | 'RegulatoryDecision' | 'ElectionOutcome' | 'EarningsSurprise'
  | 'CentralBankDecision' | 'MilitaryEvent' | 'GeopoliticalCrisis'
  | 'SupplyShock' | 'EconomicIndicator';

export interface CompanyTimeline {
  id: string;
  question: string;
  divergenceType: DivergenceType;
  branchA: string;
  branchB: string;
  probA: number;
  volumeUsdc: number;
  openInterestUsdc: number;
  spreadPct: number;
  edgeRiskScore?: number;
  edgeRiskTrend?: 'up' | 'down' | 'flat';
  resolvesAt: string;
  communityBets: number;
  probHistory: { date: string; prob: number }[];
}

export type NewsSentiment = 'positive' | 'negative' | 'neutral';
export type NewsRelation = 'involves' | 'affects' | 'triggers' | 'sanctions' | 'announces' | 'causes';

export interface CompanyNewsEvent {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
  sentiment: NewsSentiment;
  importance: number;
  verified: boolean;
  relation: NewsRelation;
  affectedEntities: { id: string; name: string; type: string }[];
}

export interface CompanyEdgeRisk {
  edgeId: string;
  sourceLabel: string;
  targetLabel: string;
  edgeType: string;
  edgeLabel: string;
  score: number;
  trend: 'up' | 'down' | 'flat';
  severityLevel: number;
  branchProbability: number;
  linkedTimelines: number;
  scoreHistory: number[];
}

// ── Hook result type ──────────────────────────────────────────────────────

export interface UseCompanyResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ── nodeId utility ────────────────────────────────────────────────────────

/**
 * Builds the graph nodeId from a company DB id.
 * Pattern confirmed from GraphController.cs: "company:{id}"
 * Example: companyNodeId(42) → "company:42"
 */
export function companyNodeId(id: number): string {
  return `company:${id}`;
}

// ── edgeWidth helper ──────────────────────────────────────────────────────

/**
 * Convert GraphEdgeDto.strength (categorical label) to a DeckGL arc pixel width.
 *
 * Strength is 'Critical' | 'High' | 'Medium' | 'Low' — confirmed from the
 * real DB SQL dump. The old edgeStrength() parseFloat approach is removed.
 *
 * Usage in DeckGL ArcLayer:
 *   getWidth: edge => edgeWidth(edge)
 */
const STRENGTH_WIDTH: Record<string, number> = {
  Critical: 4,
  High:     3,
  Medium:   2,
  Low:      1,
};

export function edgeWidth(edge: { strength?: string | null }): number {
  return STRENGTH_WIDTH[edge.strength ?? 'Low'] ?? 1;
}

// ── Edge type → DeckGL color ──────────────────────────────────────────────

export const EDGE_TYPE_COLORS: Record<string, [number, number, number, number]> = {
  supply:     [29,  158, 117, 200],
  financial:  [139, 92,  246, 180],
  trade:      [74,  144, 217, 160],
  conflict:   [224, 82,  82,  200],
  investment: [212, 168, 83,  180],
  leadership: [136, 135, 128, 160],
};

// ── Shared async hook factory ─────────────────────────────────────────────

function useService<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  enabled = true
): UseCompanyResult<T> {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetcher()
      .then(d => { if (!cancelled) setData(d); })
      .catch((err: Error) => { if (!cancelled) { setError(err.message ?? 'Error'); setData(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}

// ── Real hooks — 13 endpoints ─────────────────────────────────────────────

/**
 * useCompany — core identity by name
 * GET /api/Companies/{name}
 */
export function useCompany(name: string): UseCompanyResult<Company> {
  return useService(
    () => companyService.getByName(name) as Promise<Company>,
    [name],
    !!name
  );
}

/**
 * useCompanyById — core identity by numeric ID
 * GET /api/Companies/{id}
 */
export function useCompanyById(companyId: number): UseCompanyResult<Company> {
  return useService(
    () => companyService.getById(companyId) as Promise<Company>,
    [companyId],
    !!companyId
  );
}

/**
 * useCompanyProducts — product catalogue
 * GET /api/CompanyProducts/company/{id}
 */
export function useCompanyProducts(companyId: number): UseCompanyResult<CompanyProduct[]> {
  return useService(
    () => companyProductService.getByCompanyId(companyId) as unknown as Promise<CompanyProduct[]>,
    [companyId],
    !!companyId
  );
}

/**
 * useCompanyFabrics — operational facilities (orange rings on globe)
 * GET /api/CompanyFabrics/company/{id}
 */
export function useCompanyFabrics(companyId: number): UseCompanyResult<CompanyFabric[]> {
  return useService(
    () => companyFabricService.getByCompanyId(companyId) as Promise<CompanyFabric[]>,
    [companyId],
    !!companyId
  );
}

/**
 * useCompanyMarkets — active market regions (GeoJSON fills on globe)
 * GET /api/CompanyMarkets/company/{id}
 */
export function useCompanyMarkets(companyId: number): UseCompanyResult<CompanyMarket[]> {
  return useService(
    () => companyMarketsService.getByCompanyId(companyId) as Promise<CompanyMarket[]>,
    [companyId],
    !!companyId
  );
}

/**
 * useCompanyClients — client companies (purple arcs on globe)
 * GET /api/CompanyClients/company/{id}
 */
export function useCompanyClients(companyId: number): UseCompanyResult<CompanyClientSimple[]> {
  return useService(
    () => companyClientSimpleService.getByCompanyId(companyId) as Promise<CompanyClientSimple[]>,
    [companyId],
    !!companyId
  );
}

/**
 * useCompanyProviders — supplier companies (pink arcs on globe)
 * GET /api/CompanyProviders/company/{id}
 */
export function useCompanyProviders(companyId: number): UseCompanyResult<CompanyProvider[]> {
  return useService(
    () => companyProviderService.getByCompanyId(companyId) as unknown as Promise<CompanyProvider[]>,
    [companyId],
    !!companyId
  );
}

/**
 * useCompanyCommodities — commodity dependencies
 * GET /api/CompanyCommodities/company/{id}
 */
export function useCompanyCommodities(companyId: number): UseCompanyResult<CompanyCommodity[]> {
  return useService(
    () => companyCommodityService.getByCompanyId(companyId) as Promise<CompanyCommodity[]>,
    [companyId],
    !!companyId
  );
}

/**
 * useCompanySectors — sector classification
 * GET /api/CompanySectors/company/{id}
 */
export function useCompanySectors(companyId: number): UseCompanyResult<CompanySector[]> {
  return useService(
    () => companySectorService.getByCompanyId(companyId) as unknown as Promise<CompanySector[]>,
    [companyId],
    !!companyId
  );
}

/**
 * useCompanyRiskProfile — risk score (0-10), tier, dependency & concentration metrics.
 * GET /api/CompanyRiskProfile/company/{id}   (backend commit 801d352)
 *
 * NOTE: previously pointed at /CommodityDependency/companies/{id} which uses
 * a 0-100 score scale. The 4.3c overlay requires the 0-10 scale from the new
 * endpoint; see Phase 4.3c post-mortem.
 */
export function useCompanyRiskProfile(companyId: number): UseCompanyResult<CompanyRiskProfile> {
  return useService(
    async () => {
      const r = await fetch(`/api/CompanyRiskProfile/company/${companyId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<CompanyRiskProfile>;
    },
    [companyId],
    !!companyId,
  );
}

/**
 * useCompanyOwnership — institutional holders (Ownership tab)
 * GET /api/AssetManagerCompany/company/{id}/full
 */
export function useCompanyOwnership(companyId: number): UseCompanyResult<AssetManagerCompanyFull[]> {
  return useService(
    () => assetManagerCompanyService.getFull(companyId),
    [companyId],
    !!companyId
  );
}

/**
 * useCompanyPersons — key persons linked to company (Persons tab)
 * GET /api/Persons/by-company/{companyId}
 */
export function useCompanyPersons(companyId: number | null): UseCompanyResult<CompanyPersonSummary[]> {
  return useService(
    async () => {
      const url = `${import.meta.env.VITE_HOST}:${import.meta.env.VITE_API_PORT}/api/Persons/by-company/${companyId}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<CompanyPersonSummary[]>;
    },
    [companyId],
    !!companyId,
  );
}

/**
 * useCompanyOci — Ownership Concentration Index
 * GET /api/AssetManagerCompany/company/{id}/oci
 */
export function useCompanyOci(companyId: number): UseCompanyResult<CompanyOci> {
  return useService(
    () => assetManagerCompanyService.getOci(companyId) as unknown as Promise<CompanyOci>,
    [companyId],
    !!companyId
  );
}

/**
 * useCompanyEarnings — quarterly EPS + earnings surprise
 * GET /api/AlphaVantageEarning/earnings/{ticker}
 */
export function useCompanyEarnings(ticker: string | null | undefined): UseCompanyResult<EarningsResponse> {
  return useService(
    () => alphaEarningsService.getBySymbol(ticker!) as unknown as Promise<EarningsResponse>,
    [ticker],
    !!ticker
  );
}

/**
 * useCompanyCashFlow — FCF, operating CF, capex (quarterly bars)
 * GET /api/AlphaVantageCashFlow/cashflow/{ticker}
 */
export function useCompanyCashFlow(ticker: string | null | undefined): UseCompanyResult<CashFlowResponse> {
  return useService(
    () => cashFlowService.getBySymbol(ticker!) as unknown as Promise<CashFlowResponse>,
    [ticker],
    !!ticker
  );
}

// ── Stub hooks — 3 new backend endpoints needed ───────────────────────────
// TODO: replace stub body with real fetch once endpoints are built:
//   GET /api/Timelines?entityNodeId={nodeId}&status=open
//   GET /api/NewsEvents?entityNodeId={nodeId}&limit=20&sort=importance
//   GET /api/EdgeRiskScore?nodeId={nodeId}&sort=score_desc

function mkProbHistory(finalProb: number): { date: string; prob: number }[] {
  const pts: { date: string; prob: number }[] = [];
  let p = Math.max(10, Math.min(90, finalProb + (Math.random() > 0.5 ? -10 : 8)));
  for (let i = 14; i >= 0; i--) {
    p += (Math.random() - 0.48) * 4;
    p = Math.max(10, Math.min(90, p));
    pts.push({ date: new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), prob: Math.round(p) });
  }
  pts[pts.length - 1].prob = finalProb;
  return pts;
}

function mkRiskHistory(final: number): number[] {
  const pts: number[] = [];
  let s = Math.max(0.1, final - 0.7 + Math.random() * 0.4);
  for (let i = 0; i < 14; i++) {
    s += (Math.random() - 0.44) * 0.22;
    s = Math.max(0.1, Math.min(5, s));
    pts.push(Math.round(s * 10) / 10);
  }
  pts[pts.length - 1] = final;
  return pts;
}

export const _MOCK_TIMELINES: CompanyTimeline[] = [
  {
    id: 'nvda-eps-q2-fy26',
    question: 'NVIDIA Q2 FY2026 EPS — above $6.50 consensus?',
    divergenceType: 'EarningsSurprise',
    branchA: 'Beat · EPS > $6.50',
    branchB: 'Miss or in-line',
    probA: 71,
    volumeUsdc: 3_400_000,
    openInterestUsdc: 1_200_000,
    spreadPct: 0.6,
    edgeRiskScore: 1.8,
    edgeRiskTrend: 'flat',
    resolvesAt: 'Aug 28, 2025',
    communityBets: 1_240,
    probHistory: mkProbHistory(71),
  },
  {
    id: 'tsmc-halt-nvda',
    question: 'TSMC Taiwan fab halt — NVIDIA supply continuity plan',
    divergenceType: 'GeopoliticalCrisis',
    branchA: 'Supply disrupted',
    branchB: 'Continuity maintained',
    probA: 62,
    volumeUsdc: 890_000,
    openInterestUsdc: 440_000,
    spreadPct: 1.4,
    edgeRiskScore: 3.4,
    edgeRiskTrend: 'up',
    resolvesAt: 'Sep 30, 2025',
    communityBets: 891,
    probHistory: mkProbHistory(62),
  },
  {
    id: 'h20-full-ban',
    question: 'Full H20 GPU ban — NVIDIA China revenue → zero?',
    divergenceType: 'RegulatoryDecision',
    branchA: 'Full ban imposed',
    branchB: 'Partial or no ban',
    probA: 44,
    volumeUsdc: 760_000,
    openInterestUsdc: 310_000,
    spreadPct: 1.8,
    edgeRiskScore: 2.4,
    edgeRiskTrend: 'up',
    resolvesAt: 'Jul 15, 2025',
    communityBets: 388,
    probHistory: mkProbHistory(44),
  },
];

export const _MOCK_NEWS: CompanyNewsEvent[] = [
  {
    id: 'n1',
    headline: 'US tightens H20 export rules — NVIDIA guided to lose $5.5B in Q2 revenue',
    summary: 'The Commerce Department expanded chip export restrictions to include H20 GPUs. NVIDIA disclosed a $5.5B inventory write-down and revised Q2 revenue guidance downward.',
    source: 'Financial Times',
    publishedAt: '2025-05-14',
    sentiment: 'negative',
    importance: 10,
    verified: true,
    relation: 'affects',
    affectedEntities: [
      { id: 'country:158', name: 'China', type: 'country' },
      { id: 'company:190', name: 'TSMC', type: 'company' },
    ],
  },
  {
    id: 'n2',
    headline: 'Jensen Huang unveils Blackwell Ultra at Computex — 2.2× improvement over B100',
    summary: 'NVIDIA CEO Jensen Huang announced the Blackwell Ultra GPU at Computex 2025, targeting AI training workloads with significant performance improvements for LLM training.',
    source: 'Reuters',
    publishedAt: '2025-05-08',
    sentiment: 'positive',
    importance: 9,
    verified: true,
    relation: 'announces',
    affectedEntities: [
      { id: 'company:190', name: 'TSMC', type: 'company' },
      { id: 'company:12', name: 'Microsoft', type: 'company' },
    ],
  },
  {
    id: 'n3',
    headline: 'NVIDIA partners with Saudi Aramco — $1B AI infrastructure deal announced',
    summary: "NVIDIA signed a $1B strategic partnership with Saudi Aramco to deploy Blackwell GPUs across the Kingdom's AI infrastructure, including energy and industrial applications.",
    source: 'Wall Street Journal',
    publishedAt: '2025-04-29',
    sentiment: 'positive',
    importance: 8,
    verified: true,
    relation: 'causes',
    affectedEntities: [
      { id: 'country:183', name: 'Saudi Arabia', type: 'country' },
    ],
  },
  {
    id: 'n4',
    headline: 'NVIDIA H100 wafer allocation at TSMC increased 30% for Q3 — supply chain signal',
    summary: "Supply chain sources report NVIDIA increased its H100 and H200 wafer allocation at TSMC's N4 node by 30% ahead of Q3, signaling strong forward demand from hyperscalers.",
    source: 'Nikkei Asia',
    publishedAt: '2025-04-22',
    sentiment: 'positive',
    importance: 7,
    verified: false,
    relation: 'triggers',
    affectedEntities: [
      { id: 'company:190', name: 'TSMC', type: 'company' },
    ],
  },
  {
    id: 'n5',
    headline: 'Senate hearing on AI chip governance names NVIDIA — export policy scrutiny intensifies',
    summary: "A Senate Commerce Committee hearing cited NVIDIA's Blackwell architecture in a debate on expanding export license requirements to additional GPU tiers beyond H20.",
    source: 'Politico',
    publishedAt: '2025-04-15',
    sentiment: 'negative',
    importance: 7,
    verified: true,
    relation: 'involves',
    affectedEntities: [
      { id: 'country:1', name: 'United States', type: 'country' },
    ],
  },
];

export const _MOCK_EDGE_RISKS: CompanyEdgeRisk[] = [
  {
    edgeId: 'edge:company:42:company:190',
    sourceLabel: 'NVIDIA',
    targetLabel: 'TSMC',
    edgeType: 'supply',
    edgeLabel: 'fab manufacturing',
    score: 3.4,
    trend: 'up',
    severityLevel: 5,
    branchProbability: 0.68,
    linkedTimelines: 3,
    scoreHistory: mkRiskHistory(3.4),
  },
  {
    edgeId: 'edge:company:42:country:158',
    sourceLabel: 'NVIDIA',
    targetLabel: 'China',
    edgeType: 'trade',
    edgeLabel: 'GPU market access',
    score: 2.4,
    trend: 'up',
    severityLevel: 4,
    branchProbability: 0.60,
    linkedTimelines: 1,
    scoreHistory: mkRiskHistory(2.4),
  },
  {
    edgeId: 'edge:company:42:country:1',
    sourceLabel: 'NVIDIA',
    targetLabel: 'US Export Controls',
    edgeType: 'regulatory',
    edgeLabel: 'chip sanctions',
    score: 1.8,
    trend: 'flat',
    severityLevel: 3,
    branchProbability: 0.60,
    linkedTimelines: 2,
    scoreHistory: mkRiskHistory(1.8),
  },
  {
    edgeId: 'edge:company:42:company:78',
    sourceLabel: 'NVIDIA',
    targetLabel: 'ASML',
    edgeType: 'supply',
    edgeLabel: 'litho equipment',
    score: 1.4,
    trend: 'flat',
    severityLevel: 3,
    branchProbability: 0.47,
    linkedTimelines: 1,
    scoreHistory: mkRiskHistory(1.4),
  },
];

export function _useStub<T>(data: T, delay = 450): UseCompanyResult<T> {
  const [state, setState] = useState<UseCompanyResult<T>>({ data: null, loading: true, error: null });
  useEffect(() => {
    setState({ data: null, loading: true, error: null });
    const t = setTimeout(() => setState({ data, loading: false, error: null }), delay);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line
  return state;
}

const IMPORTANCE_MAP: Record<string, number> = {
  Critical: 10, High: 8, Medium: 5, Low: 3,
};
const SEVERITY_MAP: Record<string, number> = {
  Critical: 5, High: 4, Medium: 3, Low: 2,
};

/** useCompanyTimelines — GET /api/Timelines/by-entity?nodeId={nodeId}&status=Open */
export function useCompanyTimelines(nodeId: string): UseCompanyResult<CompanyTimeline[]> {
  return useService(
    async () => {
      const items = await companyIntelligenceService.getTimelines(nodeId) as any[];
      return items.map((item): CompanyTimeline => ({
        id: item.id,
        question: item.name,
        divergenceType: (item.divergenceType ?? 'EarningsSurprise') as DivergenceType,
        branchA: item.branchAName ?? 'Yes',
        branchB: item.branchBName ?? 'No',
        probA: Number(item.branchAProb ?? 0.5),
        volumeUsdc: 0,
        openInterestUsdc: 0,
        spreadPct: 0,
        resolvesAt: item.resolutionDate ?? '',
        communityBets: item.betCount ?? 0,
        probHistory: [],
      }));
    },
    [nodeId],
    !!nodeId,
  );
}

/** useCompanyNews — GET /api/NewsEvents?entityNodeId={nodeId}&limit=20 */
export function useCompanyNews(nodeId: string): UseCompanyResult<CompanyNewsEvent[]> {
  return useService(
    async () => {
      const items = await companyIntelligenceService.getNews(nodeId) as any[];
      return items.map((item): CompanyNewsEvent => ({
        id: String(item.id),
        headline: item.headline ?? '',
        summary: item.summary ?? '',
        source: item.sourceName ?? '',
        publishedAt: item.publishedAt ?? '',
        sentiment: (item.sentiment?.toLowerCase() ?? 'neutral') as NewsSentiment,
        importance: IMPORTANCE_MAP[item.importance] ?? 5,
        verified: item.isVerified ?? false,
        relation: (item.relation ?? 'involves') as NewsRelation,
        affectedEntities: (item.affectedEntities ?? []).map((e: any) => ({
          id: String(e.id), name: e.name ?? '', type: e.type ?? '',
        })),
      }));
    },
    [nodeId],
    !!nodeId,
  );
}

/** useCompanyEdgeRisk — GET /api/EdgeRiskScore?nodeId={nodeId}&sort=score_desc */
export function useCompanyEdgeRisk(nodeId: string): UseCompanyResult<CompanyEdgeRisk[]> {
  return useService(
    async () => {
      const items = await companyIntelligenceService.getEdgeRisks(nodeId) as any[];
      return items.map((item): CompanyEdgeRisk => ({
        edgeId: item.edgeId ?? '',
        sourceLabel: item.sourceLabel ?? '',
        targetLabel: item.targetLabel ?? '',
        edgeType: item.edgeType ?? '',
        edgeLabel: item.edgeLabel ?? '',
        score: Number(item.riskScore ?? 0),
        trend: (item.trend ?? 'flat') as 'up' | 'down' | 'flat',
        severityLevel: SEVERITY_MAP[item.strength] ?? 3,
        branchProbability: Number(item.branchProbability ?? 0),
        linkedTimelines: Number(item.openTimelineCount ?? 0),
        scoreHistory: item.scoreHistory ?? [],
      }));
    },
    [nodeId],
    !!nodeId,
  );
}

// ── Formatting helpers ────────────────────────────────────────────────────

export function formatMarketCap(usd: number | null | undefined): string {
  if (usd == null || isNaN(usd)) return '\u2014';
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(1)}T`;
  if (usd >= 1e9)  return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6)  return `$${(usd / 1e6).toFixed(1)}M`;
  return `$${usd.toLocaleString()}`;
}

export function formatEmployees(n: number | null | undefined): string {
  if (!n) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

export function formatUsdc(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function riskColor(tier: string | number): string {
  if (typeof tier === 'number') {
    if (tier >= 3.5) return '#E05252';
    if (tier >= 2.5) return '#D4A853';
    if (tier >= 1.5) return '#EF9F27';
    return '#1D9E75';
  }
  const map: Record<string, string> = {
    Critical: '#E05252',
    High:     '#D4A853',
    Medium:   '#EF9F27',
    Low:      '#1D9E75',
  };
  return map[tier] ?? '#9B9690';
}

export function dependencyColor(level: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    Critical: { bg: 'rgba(224,82,82,.12)',   text: '#E87070' },
    High:     { bg: 'rgba(212,168,83,.12)',  text: '#D4A853' },
    Medium:   { bg: 'rgba(239,159,39,.12)',  text: '#EF9F27' },
    Low:      { bg: 'rgba(29,158,117,.12)',  text: '#5DCAA5' },
  };
  return map[level] ?? { bg: 'rgba(255,255,255,.06)', text: '#9B9690' };
}

export function sentimentColor(s: NewsSentiment): string {
  return s === 'positive' ? '#1D9E75' : s === 'negative' ? '#E05252' : '#D4A853';
}

export const DIVERGENCE_LABELS: Record<DivergenceType, string> = {
  RegulatoryDecision:  'Regulatory',
  ElectionOutcome:     'Election',
  EarningsSurprise:    'Earnings',
  CentralBankDecision: 'Central bank',
  MilitaryEvent:       'Military',
  GeopoliticalCrisis:  'Geopolitical',
  SupplyShock:         'Supply shock',
  EconomicIndicator:   'Economic',
};

export const DIVERGENCE_COLORS: Record<DivergenceType, { bg: string; text: string }> = {
  RegulatoryDecision:  { bg: 'rgba(74,144,217,.12)',  text: '#6BA8E0' },
  ElectionOutcome:     { bg: 'rgba(212,168,83,.12)',  text: '#D4A853' },
  EarningsSurprise:    { bg: 'rgba(29,158,117,.12)',  text: '#1D9E75' },
  CentralBankDecision: { bg: 'rgba(139,92,246,.12)',  text: '#8B5CF6' },
  MilitaryEvent:       { bg: 'rgba(224,82,82,.12)',   text: '#E05252' },
  GeopoliticalCrisis:  { bg: 'rgba(224,82,82,.12)',   text: '#E05252' },
  SupplyShock:         { bg: 'rgba(212,168,83,.12)',  text: '#D4A853' },
  EconomicIndicator:   { bg: 'rgba(88,196,220,.12)',  text: '#58C4DC' },
};

/** Parse Alpha Vantage string EPS to number safely */
export function parseAlpha(s: string | undefined | null): number | null {
  if (!s || s === 'None' || s === 'N/A') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Compute FCF from Alpha Vantage quarterly: operatingCashflow - |capitalExpenditures| */
export function computeFCF(q: QuarterlyCashFlow): number | null {
  const op    = parseAlpha(q.operatingCashflow);
  const capex = parseAlpha(q.capitalExpenditures);
  if (op === null || capex === null) return null;
  return op - Math.abs(capex);
}
