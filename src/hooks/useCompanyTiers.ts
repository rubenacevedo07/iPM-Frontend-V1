/**
 * useCompanyTiers — GET /api/CompanyPowerIndex/{companyId}/tiers
 *
 * Returns observed tiers per dimension (political/military/financial).
 * Can diverge from CompanyPowerIndex's declared tiers — divergence is the
 * signal the CompanyPowerSignalsCard surfaces as "declared → observed".
 *
 * Shape verified via curl 2026-04-19:
 * NVIDIA: { companyId:1, companyName:"NVIDIA", politicalTier:3, militaryTier:2, financialTier:1 }
 */

import { useService, type UseCompanyResult } from './_useService';
import type { CompanyTiers } from '@/types/companyPowerIndex';

export type { CompanyTiers };

export function useCompanyTiers(
  companyId: number | undefined,
): UseCompanyResult<CompanyTiers> {
  return useService(
    async () => {
      const r = await fetch(`/api/CompanyPowerIndex/${companyId}/tiers`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<CompanyTiers>;
    },
    [companyId],
    companyId !== undefined && companyId > 0,
  );
}
