export interface AlphaEarningAnnual {
  id: number;
  companyId: number;
  symbol: string;
  fiscalDateEnding: string;
  reportedEPS: string;
}

export interface AlphaEarningQuarterly {
  id: number;
  companyId: number;
  symbol: string;
  fiscalDateEnding: string;
  reportedDate: string;
  reportedEPS: string;
  estimatedEPS: string;
  surprise: string;
  surprisePercentage: string;
  reportTime: string;
}

export interface EarningsResponse {
  symbol: string;
  annual: AlphaEarningAnnual[];
  quarterly: AlphaEarningQuarterly[];
}
