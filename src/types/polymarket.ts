export interface PolymarketToken {
  token_id: string;
  outcome: string;   // "Yes" | "No"
  price: number;
}

export interface PolymarketMarket {
  condition_id: string;
  question: string;
  description?: string;
  category?: string;
  end_date_iso?: string;
  volume?: number;
  volume_num_24hr?: number;
  tokens: PolymarketToken[];
  active: boolean;
  closed: boolean;
  market_slug?: string;
  minimum_tick_size?: number;
}

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface PolymarketOrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp?: string;
}
