/**
 * companyMarketsService.ts (ACTUALIZADO)
 * Service layer for company market data API calls
 * 
 * ENDPOINT: GET /api/CompanyMarkets/company/{companyId}
 * - Retorna múltiples regiones/mercados para una compañía
 * - Filtrado en el servidor
 * - Más eficiente
 */

export interface CompanyMarket {
  revenueContribution: null;
  id: number;
  companyId: number;
  countryContinent: string;
  description: string;
  company?: any;
}

import { API_MARKETS } from "../config/apiConfig";

const API_BASE_URL = API_MARKETS;

export const companyMarketsService = {
  /**
   * Fetch markets for a specific company
   * GET /api/CompanyMarkets/company/{companyId}
   * 
   * @param companyId - The ID of the company
   * @returns Promise<CompanyMarket[]> - Array of markets for the company (puede ser más de una región)
   * 
   * @example
   * const markets = await companyMarketsService.getByCompanyId(5);
   * // GET /api/CompanyMarkets/company/5
   */
  async getByCompanyId(companyId: number): Promise<CompanyMarket[]> {
    if (!companyId) {
      console.warn("companyMarketsService: No companyId provided");
      return [];
    }

    try {
      const url = `${API_BASE_URL}/CompanyMarkets/company/${companyId}`;
      console.log("🔄 Fetching company markets from:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
      console.log(`✅ Successfully fetched ${count} market(s) for company ${companyId}`, data);
      
      return Array.isArray(data) ? data : (data ? [data] : []);
    } catch (error) {
      console.error(`❌ Failed to fetch company markets for ID ${companyId}:`, error);
      return [];
    }
  },

  /**
   * Fetch a specific market by ID
   * GET /api/CompanyMarkets/{id}
   * 
   * @param marketId - The ID of the market
   * @returns Promise<CompanyMarket | null>
   * 
   * @example
   * const market = await companyMarketsService.getById(1);
   */
  async getById(marketId: number): Promise<CompanyMarket | null> {
    if (!marketId) {
      console.warn("companyMarketsService: No marketId provided");
      return null;
    }

    try {
      const url = `${API_BASE_URL}/CompanyMarkets/${marketId}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error(`❌ Failed to fetch market ${marketId}:`, error);
      return null;
    }
  },

  /**
   * Fetch all markets (use with caution - returns all markets)
   * GET /api/CompanyMarkets
   * 
   * @returns Promise<CompanyMarket[]>
   * 
   * @deprecated Use getByCompanyId() instead for better performance
   */
  async getAll(): Promise<CompanyMarket[]> {
    try {
      console.warn("⚠️ companyMarketsService.getAll() is deprecated. Use getByCompanyId() instead.");
      const url = `${API_BASE_URL}/CompanyMarkets`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error("❌ Failed to fetch all company markets:", error);
      return [];
    }
  },
};