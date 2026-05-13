import { apiClient } from '@/services/api/apiClient'
import type { PersonMapDto } from '@/types/_ext/personMapDto'

export const personMapService = {
  getTop15(): Promise<PersonMapDto[]> {
    // Served as a static asset from public/data/ — backend not required.
    return apiClient.get<PersonMapDto[]>('/data/persons_top_15.json')
  },
}
