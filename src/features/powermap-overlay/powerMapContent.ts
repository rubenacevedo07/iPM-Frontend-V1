// Per-power-map overlay content. Hand-authored (same pattern as the gold
// overlay's elonMuskFallback). Adding a new power-map overlay = one entry here.
// Power-map ids must match SEARCH_THEMES ids in components/TopBar/searchThemes.ts.

export interface PowerMapOverlayContent {
  id:           string
  title:        string
  subtitle:     string
  category:     string
  accentColor:  string
  brandText:    string
  badgeText:    string
  meta:         Array<{ text: string }>
  actors:       Array<{ id: string; name: string; role: string; color: string }>
  connections:  Array<{
    fromName: string
    toName:   string
    label:    string
    strength: 'Critical' | 'High' | 'Medium' | 'Low'
    hostile:  boolean
  }>
  keyData:      Array<{ label: string; value: string; color?: string }>
  timeline:     { label: string; points: Array<{ x: string; y: number }> }
  incidents:    Array<{
    date:        string
    location:    string
    description: string
    severity:    'Critical' | 'High' | 'Medium'
  }>
  regionalImpact: Array<{
    region:        string
    dependencyPct: number
    note:          string
  }>
}

export const POWER_MAP_OVERLAY_CONTENT: Record<string, PowerMapOverlayContent> = {
  'strait-of-hormuz': {
    id:           'strait-of-hormuz',
    title:        'Strait of Hormuz',
    subtitle:     'Persian Gulf chokepoint · ~20% of global seaborne oil',
    category:     'GEOPOLITICAL CHOKEPOINT',
    accentColor:  '#ef4444',
    brandText:    'POWER MAP INTELLIGENCE',
    badgeText:    'SH',
    meta: [
      { text: 'Persian Gulf' },
      { text: '26.55°N · 56.25°E' },
      { text: 'Width: 33 km' },
      { text: 'Risk: CRITICAL' },
    ],
    actors: [
      { id: 'irgc',       name: 'Iran IRGC Navy',      role: 'Maritime militia · Bandar Abbas',  color: '#dc2626' },
      { id: 'us5f',       name: 'US 5th Fleet',        role: 'CTF-152 · Manama HQ',              color: '#3b82f6' },
      { id: 'royal-navy', name: 'UK Royal Navy',       role: 'Operation Kipion · escorts',       color: '#3b82f6' },
      { id: 'iran-cg',    name: 'Iran Coast Guard',    role: 'Hormuz patrols · seizures',        color: '#dc2626' },
      { id: 'uae-navy',   name: 'UAE Navy',            role: 'Allied · Abu Dhabi base',          color: '#f59e0b' },
      { id: 'tankers',    name: 'Tanker traffic',      role: '~25K transits / year',             color: '#94a3b8' },
    ],
    connections: [
      { fromName: 'Iran IRGC Navy',    toName: 'Tanker traffic', label: 'Boarding · seizure',     strength: 'Critical', hostile: true  },
      { fromName: 'Iran IRGC Navy',    toName: 'US 5th Fleet',   label: 'Confrontation',          strength: 'Critical', hostile: true  },
      { fromName: 'US 5th Fleet',      toName: 'UK Royal Navy',  label: 'Joint escorts',          strength: 'High',     hostile: false },
      { fromName: 'US 5th Fleet',      toName: 'UAE Navy',       label: 'Allied operations',      strength: 'High',     hostile: false },
      { fromName: 'Iran Coast Guard',  toName: 'Tanker traffic', label: 'Inspection · detention', strength: 'High',     hostile: true  },
    ],
    keyData: [
      { label: 'Oil Flow',     value: '21 Mbpd',  color: '#f59e0b' },
      { label: 'Global Share', value: '20 %',     color: '#00d4aa' },
      { label: 'Transits',     value: '25K / yr', color: '#00e5ff' },
      { label: 'Risk Tier',    value: 'CRITICAL', color: '#dc2626' },
      { label: 'Min Width',    value: '33 km',    color: '#94a3b8' },
      { label: 'Depth',        value: '~100 m',   color: '#94a3b8' },
    ],
    timeline: {
      label: 'Tanker incidents · 12 months',
      points: [
        { x: 'Jun', y: 2 },  { x: 'Jul', y: 4 },  { x: 'Aug', y: 3 },  { x: 'Sep', y: 7 },
        { x: 'Oct', y: 9 },  { x: 'Nov', y: 11 }, { x: 'Dec', y: 6 },  { x: 'Jan', y: 8 },
        { x: 'Feb', y: 12 }, { x: 'Mar', y: 14 }, { x: 'Apr', y: 16 }, { x: 'May', y: 18 },
      ],
    },
    incidents: [
      { date: 'May 09, 2026', location: 'Strait of Hormuz', description: 'IRGC fast boats intercepted Liberian-flagged tanker, 8 crew detained',         severity: 'Critical' },
      { date: 'Apr 22, 2026', location: 'Bandar Abbas',     description: 'Iranian naval drill closed shipping lane for 6 hours, 14 transits delayed',   severity: 'High'     },
      { date: 'Apr 03, 2026', location: 'Persian Gulf',     description: 'Mine-like object recovered near tanker hull, no detonation',                  severity: 'High'     },
      { date: 'Mar 18, 2026', location: 'Hormuz approach',  description: 'GPS spoofing event, 3 commercial vessels reported false positions for 2 hrs', severity: 'Medium'   },
    ],
    regionalImpact: [
      { region: 'East Asia',     dependencyPct: 78, note: 'China · Japan · S. Korea' },
      { region: 'India',         dependencyPct: 65, note: 'Crude + LNG'              },
      { region: 'Europe',        dependencyPct: 28, note: 'Italy · Spain · Greece'   },
      { region: 'North America', dependencyPct:  8, note: 'US Gulf reserves buffer'  },
      { region: 'Africa',        dependencyPct: 22, note: 'Egypt · S. Africa'        },
      { region: 'Latin America', dependencyPct: 14, note: 'Brazil refining demand'   },
    ],
  },
}
