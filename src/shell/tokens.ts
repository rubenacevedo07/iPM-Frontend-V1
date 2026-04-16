/**
 * Shell design tokens — extracted from existing project patterns.
 * Sources: GlobePage.tsx C object, globalCompanies/shared.ts, DashboardHeader.scss CSS vars
 */

export const C = {
  // Backgrounds
  bg:       '#090b10',
  bgPanel:  '#0d1017',
  bgCard:   '#111620',
  bgHover:  '#161d2c',
  bgGlobe:  '#090b10',
  bgOverlay:'#0d1017f0',

  // Borders
  border:   'rgba(255,255,255,0.07)',
  borderLt: 'rgba(255,255,255,0.12)',
  borderHi: 'rgba(27,194,255,0.2)',

  // Accents
  teal:     '#00e5ff',
  tealDim:  'rgba(0,229,255,0.08)',
  tealBdr:  'rgba(0,229,255,0.25)',
  gold:     '#f5a623',
  goldDim:  'rgba(245,166,35,0.08)',
  red:      '#e53935',
  redDim:   'rgba(229,57,53,0.08)',
  amber:    '#f59e0b',
  green:    '#00d4aa',
  purple:   '#a855f7',
  cyan:     '#1bc2ff',
  blue:     '#378ADD',

  // Text
  text:     '#e8edf5',
  text2:    '#8a9bb5',
  text3:    '#4a5568',

  // Fonts
  fontUI:   "'Rajdhani', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  fontBody: "'DM Sans', sans-serif",
} as const

export type TopNav = 'powermap' | 'globe' | 'events' | 'commodities' | 'rankings' | 'supplychain' | 'relstudio'
export type LeftTab = 'map' | 'analyst' | 'rank' | 'times' | 'risk'
export type OverlayMode = 'person' | 'company' | 'country' | 'chokepoint' | 'vs' | null

export interface ShellEntity {
  id: string        // "person:7", "company:42", "country:1"
  name: string
  type: 'person' | 'company' | 'country'
  sub?: string
}
