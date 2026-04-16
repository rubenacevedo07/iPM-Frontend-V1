/**
 * assetManager.ts  —  types/assetManager.ts
 *
 * TypeScript interfaces for the AssetManager APIs.
 *
 * Endpoints:
 *   GET /api/AssetManager        → AssetManager[]
 *   GET /api/AssetManager/{id}   → AssetManager
 */

export interface AssetManager {
  id:          number;
  name:        string;
  companyType: string;
  founded:     number | null;
  founders:    string[] | null;
  headquarters: string;
  aum:         number | null;   // Assets Under Management in USD
  employees:   number | null;
  logo:        string | null;
}
