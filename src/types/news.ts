// src/types/news.ts

export interface NewsEventDto {
  id:           number;
  headline:     string | null;
  summary:      string | null;
  sourceUrl:    string | null;
  sourceName:   string | null;
  publishedAt:  string;           // ISO date-time
  sentiment:    string | null;    // Positive | Negative | Neutral | Mixed
  importance:   string | null;    // Critical | High | Medium | Low
  isVerified:   boolean;
  relation:     string | null;    // edge relation label (only when filtered by entity)
  edgeSentiment:string | null;
}
