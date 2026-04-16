import { API_ALPHAVANTAGE } from "../config/apiConfig";
import type { EarningsResponse } from "../types/alphaEarnings";

export const alphaEarningsService = {
  getBySymbol: async (symbol: string): Promise<EarningsResponse> => {
    const response = await fetch(`${API_ALPHAVANTAGE}/AlphaVantageEarning/earnings/${symbol}`);

    if (!response.ok) {
      throw new Error(`Error fetching earnings for ${symbol}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
};
