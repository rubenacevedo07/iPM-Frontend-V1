import { API_ALPHAVANTAGE } from "../config/apiConfig";
import type { CashFlowResponse } from "../types/alphaCashFlow";

export const cashFlowService = {
  getBySymbol: async (symbol: string): Promise<CashFlowResponse> => {
    const response = await fetch(`${API_ALPHAVANTAGE}/AlphaVantageCashFlow/cashflow/${symbol}`);

    if (!response.ok) {
      throw new Error(`Error fetching cash flow for ${symbol}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
};
