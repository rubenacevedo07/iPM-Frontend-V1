/**
 * assetManagerService.ts  —  services/assetManagerService.ts
 *
 * Service for the AssetManager endpoints.
 * Endpoints:
 *   GET /api/AssetManager        → AssetManager[]
 *   GET /api/AssetManager/{id}   → AssetManager
 */

import { API_ASSET_MANAGERS } from "../config/apiConfig";
import type { AssetManager } from "../types/assetManager";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json() as Promise<T>;
}

export const assetManagerService = {
  /** GET /api/AssetManager */
  getAll(): Promise<AssetManager[]> {
    return get<AssetManager[]>(`${API_ASSET_MANAGERS}/AssetManager`);
  },

  /** GET /api/AssetManager/{id} */
  getById(id: number): Promise<AssetManager> {
    return get<AssetManager>(`${API_ASSET_MANAGERS}/AssetManager/${id}`);
  },
};
