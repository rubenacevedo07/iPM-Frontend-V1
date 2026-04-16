import { API_POWER_MAPS } from '@/config/apiConfig'
import type { Sector } from '@/types/sector'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API GET error ${res.status}: ${res.statusText}`)
  return res.json()
}

async function post<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API POST error ${res.status}`)
  return res.json()
}

async function put(url: string, data: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API PUT error ${res.status}`)
}

async function remove(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API DELETE error ${res.status}`)
}

export const sectorService = {
  getAll: (): Promise<Sector[]> => get<Sector[]>(`${API_POWER_MAPS}/Sectors`),
  getById: (id: number): Promise<Sector> => get<Sector>(`${API_POWER_MAPS}/Sectors/${id}`),
  create: (data: Partial<Sector>): Promise<Sector> => post<Sector>(`${API_POWER_MAPS}/Sectors`, data),
  update: (id: number, data: Partial<Sector>): Promise<void> => put(`${API_POWER_MAPS}/Sectors/${id}`, data),
  delete: (id: number): Promise<void> => remove(`${API_POWER_MAPS}/Sectors/${id}`),
}
