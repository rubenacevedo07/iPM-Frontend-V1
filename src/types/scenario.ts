/** Matches C# ScenarioCascade model (camelCase) */
export interface ScenarioCascade {
  id: number
  name: string
  triggerEvent: string
  triggerDate: string | null
  status: string
  propagationRules: string | null
  createdAt: string
  updatedAt: string | null
}
