import { API_COMPANIES } from '@/config/apiConfig'
import type { Company } from '@/types/company'

export const companyService = {
  getAll: async (): Promise<Company[]> => {
    try {
      const response = await fetch(`${API_COMPANIES}/Companies`)
      if (!response.ok) throw new Error(`${response.status}`)
      return response.json()
    } catch {
      const res = await fetch('/top3.json')
      return res.json()
    }
  },

  getByName: async (name: string): Promise<Company> => {
    const response = await fetch(`${API_COMPANIES}/Companies/${name}`)
    return response.json()
  },

  getById: async (id: number): Promise<Company> => {
    try {
      const response = await fetch(`${API_COMPANIES}/Companies/${id}`)
      if (!response.ok) throw new Error(`${response.status}`)
      return response.json()
    } catch {
      const res = await fetch('/company.json')
      return res.json()
    }
  },
}
