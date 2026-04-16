import { API_SECTORS } from '@/config/apiConfig'
import type { CompanySector } from '@/types/companySector'

export const companySectorService = {
  async getByCompanyId(companyId: number): Promise<CompanySector[]> {
    const url = `${API_SECTORS}/CompanySectors/company/${companyId}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data: CompanySector[] = await response.json()
    return data.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
  },
}
