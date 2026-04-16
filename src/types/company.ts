export interface Company {
  id: number; // Added ID for keys in lists
  name: string;
  category: string;
  country: string;
  founders: string[];
  ceo: string;
  logo: string;
  marketCapUsd: number;
  revenueUsd?: number | null; // Nullable to match DB
  netIncomeUsd?: number | null;
  equityUsd?: number | null;
  headquarters: string; // Changed from array if you ran the ALTER command
  latitude: number;
  longitude: number;
  lastUpdated?: string; // Helpful for cache-busting
  market?: string | null;
  employees?: number | null;
  regionId?: number;
  ticker?: string | null;
  // Intelligence fields
  description?: string | null;
  aiNarrative?: string | null;
  isChokepoint?: boolean | null;
  softDependencyScore?: number | null;
  founded?: number | null;
  systemicImportanceLevel?: string | null;
  substitutionLatencyMonths?: number | null;
}