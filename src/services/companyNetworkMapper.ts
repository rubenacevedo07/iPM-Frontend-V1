// src/services/companyNetworkMapper.ts
// Phase 8: pure mapper — provider/client rows + companyById lookup → EngineArc[].
//
// Lives at the service boundary (Rule 4): no DTO-shaped fields leak outward,
// the engine sees only EngineArc instances. Pure function, no I/O, no
// React state, no globals — Stage 6 will exercise it through CompanyOverlayHost.
//
// Coverage caveat: orphans (provider/client whose id is not in the loaded
// companyById lookup, or whose target lacks usable coords) are silently
// skipped. Documented in PHASE_8_DEBT (a). Phase 8.2 fixes this with a
// dedicated backend endpoint or enriched mapper.

import type { Company } from '@/types/company';
import type { EngineArc } from '@/engine/contracts/inputs';

// ---------------------------------------------------------------------------
// Row shapes — honest to C1 verification (2026-04-24).
//
// CompanyProvider (src/types/companyProvider.ts) declares both fields non-null.
// CompanyClientSimple (src/hooks/useCompanyData.ts:170) declares both nullable.
// Three other declarations of CompanyClientSimple exist in the repo with
// diverging nullability — the hook-local one is the source of truth at runtime.
// ---------------------------------------------------------------------------
interface ProviderRow { providerId: number;        contractValue: number; }
interface ClientRow   { clientId:   number | null; contractValue: number | null; }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_PER_KIND  = 10;  // top-10 providers + top-10 clients → max 20 arcs
const MIN_INTENSITY = 0.3;
const MAX_INTENSITY = 1.0;

// ---------------------------------------------------------------------------
// Coord guard — rejects null-island (0, 0) placeholders the backend may emit
// for unresolved coords. Cheap defensive check; Company.lat/lng are typed
// non-null but the runtime payload may still carry zeroes.
// ---------------------------------------------------------------------------
const hasValidCoords = (c: Company): boolean =>
  c.longitude != null && c.latitude != null &&
  !(c.longitude === 0 && c.latitude === 0);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export interface MapCompanyNetworkParams {
  focalCompany: Company;
  providers:    ProviderRow[];
  clients:      ClientRow[];
  companyById:  Record<number, Company>;
}

/**
 * Map a focal company's provider/client network into deck.gl arc inputs.
 *
 * Behaviour:
 * - Top-N selection per kind (N = MAX_PER_KIND), sorted by contractValue desc.
 * - Linear intensity scaling: [MIN_INTENSITY, MAX_INTENSITY] using the maximum
 *   contractValue across both kinds as the reference. Single-arc input gets
 *   MAX_INTENSITY. Empty input → empty output.
 * - Orphan provider/client (target id missing from companyById, or coords
 *   invalid) is silently skipped. Coverage caveat documented in PHASE_8_DEBT.
 *
 * Returned arcs are stable: same focalCompany + same input rows yield the
 * same arcId, so deck.gl's diffing keeps animation state intact across
 * fetches that produce identical sets.
 */
export function mapCompanyNetworkToArcs(params: MapCompanyNetworkParams): EngineArc[] {
  const { focalCompany, providers, clients, companyById } = params;

  if (!hasValidCoords(focalCompany)) return [];
  const sourceLL: [number, number] = [focalCompany.longitude, focalCompany.latitude];
  const focalNodeId = `company:${focalCompany.id}`;

  // Providers: both fields non-null per type; no defensive filter needed.
  const topProviders = [...providers]
    .sort((a, b) => b.contractValue - a.contractValue)
    .slice(0, MAX_PER_KIND);

  // Clients: nullable at the hook site; filter before sorting so null values
  // don't poison the comparator.
  const topClients = clients
    .filter(c => c.clientId != null && c.contractValue != null)
    .sort((a, b) => (b.contractValue ?? 0) - (a.contractValue ?? 0))
    .slice(0, MAX_PER_KIND);

  const allValues = [
    ...topProviders.map(p => p.contractValue),
    ...topClients.map(c => c.contractValue ?? 0),
  ];
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;

  const intensityOf = (v: number): number => {
    if (maxValue <= 0) return MIN_INTENSITY;
    const scaled = v / maxValue;
    return MIN_INTENSITY + scaled * (MAX_INTENSITY - MIN_INTENSITY);
  };

  const arcs: EngineArc[] = [];

  for (const p of topProviders) {
    const other = companyById[p.providerId];
    if (!other || !hasValidCoords(other)) continue;
    arcs.push({
      arcId:        `company:${other.id}->${focalNodeId}`,
      sourceNodeId: `company:${other.id}`,
      targetNodeId: focalNodeId,
      source:       [other.longitude, other.latitude],
      target:       sourceLL,
      kind:         'supplier',
      intensity:    intensityOf(p.contractValue),
    });
  }

  for (const c of topClients) {
    const other = companyById[c.clientId as number];
    if (!other || !hasValidCoords(other)) continue;
    arcs.push({
      arcId:        `${focalNodeId}->company:${other.id}`,
      sourceNodeId: focalNodeId,
      targetNodeId: `company:${other.id}`,
      source:       sourceLL,
      target:       [other.longitude, other.latitude],
      kind:         'client',
      intensity:    intensityOf(c.contractValue ?? 0),
    });
  }

  return arcs;
}
