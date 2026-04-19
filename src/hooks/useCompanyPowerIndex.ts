/**
 * useCompanyPowerIndex — GET /api/CompanyPowerIndex/{companyId}
 *
 * Composite 6-dimension power signals + declared tiers. Feeds the
 * CompanyPowerSignalsCard in CompanyView LeftPanel.
 *
 * Shape verified via curl 2026-04-19. See @/types/companyPowerIndex.
 */

import { useService, type UseCompanyResult } from './_useService';
import type { CompanyPowerIndex } from '@/types/companyPowerIndex';

export type { CompanyPowerIndex };

export function useCompanyPowerIndex(
  companyId: number | undefined,
): UseCompanyResult<CompanyPowerIndex> {
  return useService(
    async () => {
      const r = await fetch(`/api/CompanyPowerIndex/${companyId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<CompanyPowerIndex>;
    },
    [companyId],
    companyId !== undefined && companyId > 0,
  );
}
