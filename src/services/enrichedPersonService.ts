import { apiClient } from '@/services/api/apiClient'
import type { EnrichedPerson } from '@/types/_ext/enrichedPerson'

export const enrichedPersonService = {
  getAll(): Promise<EnrichedPerson[]> {
    // Static asset under public/data/ — curated by hand, no backend.
    return apiClient.get<EnrichedPerson[]>('/data/persons_top_15_enriched.json')
  },
}
