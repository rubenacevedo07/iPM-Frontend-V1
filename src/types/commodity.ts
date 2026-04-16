export interface Commodity {
  id:                 number;
  name:               string;
  country:            string;
  description:        string;
  industries:         string;
  symbol:             string;
  unit:               string;
  category:           string;
  categoryId:         number | null;
  countryId:          number | null;
  companyCommodities: unknown[];
  countryTrades:      unknown[];
}

export interface CommodityCategory {
  id:       number;
  name:     string;
  category: string;
}
