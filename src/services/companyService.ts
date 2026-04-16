import { API_COMPANIES } from '@/config/apiConfig'
import type { Company } from '@/types/company'

export const companyService = {
  getAll: async (): Promise<Company[]> => {
    const response = await fetch(`${API_COMPANIES}/Companies`)
    if (!response.ok) {
      throw new Error(`Error fetching companies: ${response.statusText}`)
    }
    return response.json()
  },

  getByName: async (name: string): Promise<Company> => {
    const response = await fetch(`${API_COMPANIES}/Companies/${name}`)
    return response.json()
  },

  getById: async (id: number): Promise<Company> => {
    const response = await fetch(`${API_COMPANIES}/Companies/${id}`)
    if (!response.ok) throw new Error(`Error fetching company ${id}: ${response.statusText}`)
    return response.json()
  },
}
