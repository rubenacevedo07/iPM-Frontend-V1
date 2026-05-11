import { apiClient } from '@/services/api/apiClient'
import type { PersonMapDto } from '@/types/_ext/personMapDto'

export const personMapService = {
  getTop15(): Promise<PersonMapDto[]> {
    return apiClient.get<PersonMapDto[]>('/api/persons/top15')
  },
}
