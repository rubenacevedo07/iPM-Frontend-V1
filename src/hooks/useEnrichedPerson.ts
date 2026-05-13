import { useQuery } from '@tanstack/react-query'
import { enrichedPersonService } from '@/services/enrichedPersonService'
import type {
  EnrichedPerson,
  EnrichedSeverity,
  EnrichedStrength,
} from '@/types/_ext/enrichedPerson'
import type { DemoSignal, DemoConnection } from '@/features/person-overlay/personFallbackData'

const SEVERITY_COLOR: Record<EnrichedSeverity, string> = {
  critical: '#e53935',
  high:     '#e53935',
  medium:   '#f5a623',
  low:      '#00e5ff',
}

const STRENGTH_COLOR: Record<EnrichedStrength, { ring: string; score: string }> = {
  Critical: { ring: '#00d4aa', score: '#00e5ff' },
  High:     { ring: '#00e5ff', score: '#00e5ff' },
  Medium:   { ring: '#f5a623', score: '#f5a623' },
  Low:      { ring: '#6b7a90', score: '#6b7a90' },
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ageFromIso(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const ms = Date.now() - then
  if (ms < 0) return 'soon'
  const h = Math.floor(ms / 3_600_000)
  if (h < 1)   return 'now'
  if (h < 24)  return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 5)   return `${w}w`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo`
  const y = Math.floor(d / 365)
  return `${y}y`
}

export interface EnrichedPersonView {
  person:          EnrichedPerson
  signals:         DemoSignal[]
  connections:     DemoConnection[]
  clientsPartners: DemoConnection[]
}

export function useEnrichedPerson(personId: number | null | undefined) {
  return useQuery<EnrichedPersonView | null>({
    queryKey: ['enrichedPerson', personId],
    enabled:  personId != null && personId > 0,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const all = await enrichedPersonService.getAll()
      const person = all.find(p => p.id === personId)
      if (!person) return null

      const signals: DemoSignal[] = person.signals.map(s => ({
        src:   s.source,
        color: SEVERITY_COLOR[s.severity] ?? '#6b7a90',
        age:   ageFromIso(s.publishedAt),
        text:  s.headline,
      }))

      const mapConnection = (c: typeof person.connections[number]): DemoConnection => {
        const palette = STRENGTH_COLOR[c.strength] ?? STRENGTH_COLOR.Medium
        return {
          initials:   toInitials(c.name),
          name:       c.name,
          role:       `${c.role} · ${c.edgeType}`,
          score:      c.strength,
          color:      palette.ring,
          scoreColor: palette.score,
          nodeId:     '',
        }
      }

      return {
        person,
        signals,
        connections:     person.connections.map(mapConnection),
        clientsPartners: person.clientsPartners.map(mapConnection),
      }
    },
  })
}
