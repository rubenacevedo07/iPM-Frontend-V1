import { useState, useEffect, useCallback } from 'react'
import { scenarioService } from '@/services/scenarioService'
import type { ScenarioCascade } from '@/types/scenario'

export function useScenarios() {
  const [scenarios, setScenarios] = useState<ScenarioCascade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState<number | null>(null)

  useEffect(() => {
    scenarioService.getAll()
      .then(setScenarios)
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  const runScenario = useCallback(async (id: number) => {
    setRunning(id)
    try {
      const updated = await scenarioService.run(id)
      setScenarios(prev => prev.map(s => s.id === id ? updated : s))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(null)
    }
  }, [])

  return { scenarios, loading, error, running, runScenario }
}
