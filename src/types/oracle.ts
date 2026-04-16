/** Matches C# AnalystPrediction model (camelCase) */
export interface AnalystPrediction {
  id: number
  analystRealName: string
  machineName: string
  assetOrTopic: string
  predictionText: string
  predictedOutcome: string
  resolutionCondition: string | null
  resolutionDate: string
  probabilityStated: number | null
  sourceUrl: string | null
  publishedAt: string
  status: string  // DB uses: OPEN, CORRECT, INCORRECT
  brierScore: number | null
  resolvedAt: string | null
  createdAt: string
}

/** Stats from /api/oracle/predictions/stats — anonymous object */
export interface OracleStats {
  total: number
  open: number
  resolved: number
  percentCorrect: number
  avgBrierScore: number | null
}

/** Leaderboard entry from /api/oracle/predictions/leaderboard — anonymous object */
export interface OracleLeaderboardEntry {
  machineName: string
  count: number
  correct: number
  percentCorrect: number
  avgBrierScore: number | null
}
