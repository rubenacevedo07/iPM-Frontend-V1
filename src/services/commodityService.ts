import { API_COMMODITIES } from "../config/apiConfig";
import type { Commodity, CommodityCategory } from "../types/commodity";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Commodity API error ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export const commodityService = {
  getAll(): Promise<Commodity[]> {
    return fetchJson<Commodity[]>(`${API_COMMODITIES}/Commodities`);
  },

  getByCountryId(countryId: number): Promise<Commodity[]> {
    return fetchJson<Commodity[]>(`${API_COMMODITIES}/Commodities/country/${countryId}`);
  },

  getByCategoryId(categoryId: number): Promise<Commodity[]> {
    return fetchJson<Commodity[]>(`${API_COMMODITIES}/Commodities/Category/${categoryId}`);
  },

  getAllCategories(): Promise<CommodityCategory[]> {
    return fetchJson<CommodityCategory[]>(`${API_COMMODITIES}/CommoditiesCategories`);
  },
};
