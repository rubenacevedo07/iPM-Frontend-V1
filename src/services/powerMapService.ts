import { API_POWER_MAPS } from '@/config/apiConfig'
import type { PowerMapSummary, PowerMap, PowerMapLayer, PowerMapElement } from '@/types/powerMap'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API GET error ${res.status}: ${res.statusText} — ${url}`)
  return res.json()
}

async function post<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API POST error ${res.status}: ${res.statusText} — ${url}`)
  return res.json()
}

async function put<T>(url: string, data: unknown): Promise<T | void> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API PUT error ${res.status}: ${res.statusText} — ${url}`)
  return res.status !== 204 ? res.json() : undefined
}

async function remove(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API DELETE error ${res.status}: ${res.statusText} — ${url}`)
}

export const powerMapService = {
  getAll: (): Promise<PowerMapSummary[]> => get<PowerMapSummary[]>(`${API_POWER_MAPS}/PowerMaps`),
  getPowerMapById: (id: number): Promise<PowerMap> => get<PowerMap>(`${API_POWER_MAPS}/PowerMaps/${id}`),
  createPowerMap: (data: Partial<PowerMap>): Promise<PowerMap> => post<PowerMap>(`${API_POWER_MAPS}/PowerMaps`, data),
  updatePowerMap: (id: number, data: Partial<PowerMap>): Promise<void> => put<void>(`${API_POWER_MAPS}/PowerMaps/${id}`, data),
  deletePowerMap: (id: number): Promise<void> => remove(`${API_POWER_MAPS}/PowerMaps/${id}`),
  getLayersByMapId: (mapId: number): Promise<PowerMapLayer[]> => get<PowerMapLayer[]>(`${API_POWER_MAPS}/PowerMapLayers/by-map/${mapId}`),
  createLayer: (data: Partial<PowerMapLayer>): Promise<PowerMapLayer> => post<PowerMapLayer>(`${API_POWER_MAPS}/PowerMapLayers`, data),
  updateLayer: (id: number, data: Partial<PowerMapLayer>): Promise<void> => put<void>(`${API_POWER_MAPS}/PowerMapLayers/${id}`, data),
  deleteLayer: (id: number): Promise<void> => remove(`${API_POWER_MAPS}/PowerMapLayers/${id}`),
  getElementsByLayerId: (layerId: number): Promise<PowerMapElement[]> => get<PowerMapElement[]>(`${API_POWER_MAPS}/PowerMapElements/by-layer/${layerId}`),
  createElement: (data: Partial<PowerMapElement>): Promise<PowerMapElement> => post<PowerMapElement>(`${API_POWER_MAPS}/PowerMapElements`, data),
  updateElement: (id: number, data: Partial<PowerMapElement>): Promise<void> => put<void>(`${API_POWER_MAPS}/PowerMapElements/${id}`, data),
  deleteElement: (id: number): Promise<void> => remove(`${API_POWER_MAPS}/PowerMapElements/${id}`),
}
