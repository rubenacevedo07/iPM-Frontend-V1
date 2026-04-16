import { useState, useEffect } from 'react'
import { oracleService } from '@/services/oracleService'
import type { AnalystPrediction, OracleStats, OracleLeaderboardEntry } from '@/types/oracle'

export function useOracle() {
  const [predictions, setPredictions] = useState<AnalystPrediction[]>([])
  const [stats, setStats] = useState<OracleStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<OracleLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      oracleService.getPredictions(),
      oracleService.getStats(),
      oracleService.getLeaderboard(),
    ])
      .then(([p, s, l]) => { setPredictions(p); setStats(s); setLeaderboard(l) })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { predictions, stats, leaderboard, loading, error }
}
