export type SearchTheme = {
  id: string
  label: string
  subtitle: string
  category: string
  accent: string
}

export const SEARCH_THEMES: SearchTheme[] = [
  {
    id: 'wall-street',
    label: 'Wall Street',
    subtitle: 'Banks, funds, capital flows and hidden ownership',
    category: 'Power Map',
    accent: '#f5a623',
  },
  {
    id: 'city-of-london',
    label: 'City of London',
    subtitle: 'UK financial hub, offshore capital and regulatory webs',
    category: 'Power Map',
    accent: '#34d399',
  },
  {
    id: 'german-industries',
    label: 'German Industries',
    subtitle: 'Manufacturing, supply chains and export dependencies',
    category: 'Power Map',
    accent: '#38bdf8',
  },
  {
    id: 'ai-power-map',
    label: 'AI Power Map',
    subtitle: 'AI platforms, chipmakers, labs and investment influence',
    category: 'AI',
    accent: '#a855f7',
  },
  {
    id: 'blackrock-power-map',
    label: 'BlackRock Power Map',
    subtitle: 'Asset ownership, voting influence and portfolio control',
    category: 'Power Map',
    accent: '#94a3b8',
  },
  {
    id: 'iran-usa-war',
    label: 'Iran-USA War',
    subtitle: 'Conflict actors, oil risk and geopolitics in one view',
    category: 'Geopolitics',
    accent: '#ef4444',
  },
  {
    id: 'strait-of-hormuz',
    label: 'Strait of Hormuz',
    subtitle: 'Iran IRGC tanker threat · US 5th Fleet repositioned · Persian Gulf chokepoint',
    category: 'Geopolitics',
    accent: '#ef4444',
  },
]
