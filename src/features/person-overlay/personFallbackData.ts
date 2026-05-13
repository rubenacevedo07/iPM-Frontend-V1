import type { PersonIntelligence, NeighborsResponse } from '@/domain/types'

// ── Elon Musk — DB id 7, nodeId "person:7" ───────────────────────────────────
export const elonMuskFallback: PersonIntelligence = {
  id: 7,
  fullName: 'Elon Musk',
  firstName: 'Elon',
  lastName: 'Musk',
  title: 'CEO of Tesla, SpaceX, xAI',
  photoUrl: 'Musk.jpeg',
  nodeId: 'person:7',
  archetypeCode: 'TECHNOLOGICAL',
  influenceDomain: 'Technology',
  compositeScore: 91,
  globalRank: 4,
  ideology: {
    econScore: 7.2,
    authScore: -3.1,
    culturalScore: -5.4,
    geoScore: 6.8,
    genderScore: -4.0,
    envScore: 4.5,
    religionScore: -1.2,
    labelTags: ['Libertarian-Tech', 'Free Market', 'Anti-Regulatory', 'Geo-Expansionist'],
  },
  wealth: {
    netWorthUsd: 340_000_000_000,
    wealthRank: 1,
    wealthSource: 'Tesla · SpaceX · X · xAI',
  },
  powerScores: [
    { dimensionName: 'Capital Leverage',    score: 9.8 },
    { dimensionName: 'Network Centrality',  score: 9.1 },
    { dimensionName: 'Technological Power', score: 9.6 },
    { dimensionName: 'Geopolitical Reach',  score: 8.4 },
    { dimensionName: 'Media Influence',     score: 9.3 },
    { dimensionName: 'Institutional Power', score: 7.2 },
  ],
  vulnerabilities: [
    { category: 'VULNERABILITY', dimensionName: 'Regulatory Exposure',    score: 7.8, severity: 'high'     },
    { category: 'VULNERABILITY', dimensionName: 'Geopolitical Dependency', score: 6.4, severity: 'medium'   },
    { category: 'VULNERABILITY', dimensionName: 'Reputational Fragility',  score: 8.2, severity: 'high'     },
    { category: 'POWER',         dimensionName: 'Capital Leverage',        score: 9.8, severity: 'critical' },
  ],
  sectors: [
    { sectorName: 'Technology',      isPrimary: true,  exposure: 9.4 },
    { sectorName: 'Aerospace',       isPrimary: false, exposure: 8.1 },
    { sectorName: 'Automotive / EV', isPrimary: false, exposure: 7.6 },
    { sectorName: 'AI / ML',         isPrimary: false, exposure: 8.8 },
    { sectorName: 'Social Media',    isPrimary: false, exposure: 6.9 },
  ],
  supplyChain: [
    { entityName: 'TSMC',      entityType: 'company', dependency: 'Semiconductor fabrication', risk: 'critical' },
    { entityName: 'NVIDIA',    entityType: 'company', dependency: 'AI compute supply',         risk: 'high'     },
    { entityName: 'Panasonic', entityType: 'company', dependency: 'Battery cells (Tesla)',      risk: 'medium'   },
    { entityName: 'SpaceX',    entityType: 'company', dependency: 'Launch vehicles',            risk: 'low'      },
    { entityName: 'China',     entityType: 'country', dependency: 'Tesla Shanghai revenue ~30%',risk: 'high'     },
  ],
  powerMapId: 1,
}

// ── Donald Trump — DB id 173, nodeId "person:173" ────────────────────────────
export const donaldTrumpFallback: PersonIntelligence = {
  id: 173,
  fullName: 'Donald Trump',
  firstName: 'Donald',
  lastName: 'Trump',
  title: 'President of the United States',
  photoUrl: 'Trump.jpg',
  nodeId: 'person:173',
  archetypeCode: 'POLITICAL',
  influenceDomain: 'Politics',
  compositeScore: 76,
  globalRank: 1,
  ideology: {
    econScore: 5.8,
    authScore: 4.0,
    culturalScore: 3.2,
    geoScore: 7.2,
    genderScore: 2.0,
    envScore: -3.0,
    religionScore: 3.5,
    labelTags: ['Nationalist', 'Protectionist', 'Anti-Regulatory', 'America-First'],
  },
  wealth: {
    netWorthUsd: 5_400_000_000,
    wealthRank: null,
    wealthSource: 'Trump Organization · Truth Social',
  },
  powerScores: [
    { dimensionName: 'Institutional Power', score: 9.8 },
    { dimensionName: 'Geopolitical Reach',  score: 9.5 },
    { dimensionName: 'Media Influence',     score: 8.8 },
    { dimensionName: 'Network Centrality',  score: 8.2 },
    { dimensionName: 'Capital Leverage',    score: 6.4 },
    { dimensionName: 'Technological Power', score: 3.1 },
  ],
  vulnerabilities: [
    { category: 'VULNERABILITY', dimensionName: 'Legal Exposure',       score: 8.2, severity: 'high'   },
    { category: 'VULNERABILITY', dimensionName: 'Institutional Checks', score: 6.8, severity: 'medium' },
    { category: 'POWER',         dimensionName: 'Institutional Power',  score: 9.8, severity: 'critical'},
  ],
  sectors: [
    { sectorName: 'Government',         isPrimary: true,  exposure: 9.8 },
    { sectorName: 'Real Estate',        isPrimary: false, exposure: 6.2 },
    { sectorName: 'Media / Social',     isPrimary: false, exposure: 7.1 },
    { sectorName: 'Defense & Security', isPrimary: false, exposure: 8.4 },
  ],
  supplyChain: [],
  powerMapId: 2,
}

// ── Demo companies list for Elon Musk ─────────────────────────────────────────
export interface DemoCompany {
  icon: string
  color: string
  name: string
  role: string
  cap: string
}

export const elonMuskCompanies: DemoCompany[] = [
  { icon: 'T',   color: '#e53935', name: 'Tesla',      role: 'CEO',     cap: '$1.5T' },
  { icon: '🚀',  color: '#a855f7', name: 'SpaceX',     role: 'CEO',     cap: '$350B' },
  { icon: 'X',   color: '#00e5ff', name: 'xAI',        role: 'Founder', cap: '$50B'  },
  { icon: 'N',   color: '#00d4aa', name: 'Neuralink',  role: 'Founder', cap: '$9B'   },
  { icon: 'B',   color: '#f5a623', name: 'Boring Co.', role: 'Founder', cap: '$7.6B' },
]

export const trumpCompanies: DemoCompany[] = [
  { icon: 'T',   color: '#f5a623', name: 'Trump Organization', role: '', cap: '$5B'   },
  { icon: 'DJT', color: '#e53935', name: 'Truth Social',       role: '', cap: '$6.8B' },
]

// ── Demo connections list ─────────────────────────────────────────────────────
export interface DemoConnection {
  initials: string
  name: string
  role: string
  score: string
  color: string
  scoreColor: string
  nodeId: string
  latitude?: number
  longitude?: number
}

export const elonMuskFocalCoords: [number, number] = [-97.7431, 30.2672] // Tesla HQ, Austin TX [lon, lat]

export const elonMuskConnections: DemoConnection[] = [
  { initials: 'DT', name: 'Donald Trump', role: 'President USA · Allied',   score: '9.2', color: '#00d4aa', scoreColor: '#00e5ff', nodeId: 'person:173', latitude: 38.9072,  longitude: -77.0369  },
  { initials: 'JH', name: 'Jensen Huang', role: 'CEO NVIDIA · Partners',    score: '8.9', color: '#00e5ff', scoreColor: '#00e5ff', nodeId: 'person:1',   latitude: 37.3387,  longitude: -121.9886 },
  { initials: 'JP', name: 'Jerome Powell',role: 'Fed Chairman · Monitors',  score: '7.6', color: '#6b7a90', scoreColor: '#6b7a90', nodeId: 'person:192', latitude: 38.9072,  longitude: -77.0369  },
  { initials: 'LF', name: 'Larry Fink',   role: 'CEO BlackRock · Finances', score: '7.6', color: '#6b7a90', scoreColor: '#6b7a90', nodeId: 'person:75',  latitude: 40.7128,  longitude: -74.0060  },
]

export const trumpConnections: DemoConnection[] = [
  { initials: 'EM', name: 'Elon Musk',    role: 'CEO Tesla · Allied',       score: '9.2', color: '#00d4aa', scoreColor: '#00e5ff', nodeId: 'person:7'   },
  { initials: 'XJ', name: 'Xi Jinping',   role: 'President China · Trade War', score: '8.8', color: '#e53935', scoreColor: '#e53935', nodeId: 'person:171' },
  { initials: 'JP', name: 'Jerome Powell',role: 'Fed Chairman · Pressures', score: '9.0', color: '#f5a623', scoreColor: '#f5a623', nodeId: 'person:192' },
]

export const elonMuskClients: DemoConnection[] = [
  { initials: '🏛', name: 'US DoD', role: 'Official',        score: '9.1', color: '#378ADD', scoreColor: '#00e5ff', nodeId: 'country:1', latitude: 38.8719, longitude: -77.0569  },
  { initials: '🚀', name: 'NASA',   role: 'Major Client',    score: '8.9', color: '#378ADD', scoreColor: '#00e5ff', nodeId: 'country:1', latitude: 29.5594, longitude: -95.0897  },
  { initials: 'CT', name: 'CATL',   role: 'China Strategic', score: '5.7', color: '#f5a623', scoreColor: '#f5a623', nodeId: 'company:2', latitude: 26.6569, longitude: 119.5197 },
]

// ── Demo sectors list ─────────────────────────────────────────────────────────
export interface DemoSector {
  name: string
  status: string
  color: string
}

export const elonMuskSectors: DemoSector[] = [
  { name: 'EV & Energy',           status: 'Primary',   color: '#00e5ff' },
  { name: 'Aerospace & Defense',   status: 'Primary',   color: '#00e5ff' },
  { name: 'AI / LLM',             status: 'Growing',   color: '#00d4aa' },
  { name: 'Social / Media',        status: 'Secondary', color: '#f5a623' },
  { name: 'Neurotechnology',       status: 'Emerging',  color: '#a855f7' },
]

// ── Demo signals ──────────────────────────────────────────────────────────────
export interface DemoSignal {
  src: string
  color: string
  age: string
  text: string
}

export const elonMuskSignals: DemoSignal[] = [
  { src: 'REUTERS',   color: '#e53935', age: '2h', text: 'DOGE advisory role under congressional review. Shutdown risk elevated.' },
  { src: 'BLOOMBERG', color: '#00e5ff', age: '6h', text: 'Tesla Shanghai output hits record. Q2 deliveries above consensus.' },
  { src: 'FT',        color: '#f5a623', age: '1d', text: 'SpaceX Starship test flight 7 scheduled. FAA license pending.' },
]

export const trumpSignals: DemoSignal[] = [
  { src: 'AP',  color: '#e53935', age: '4h',  text: 'Tariff negotiations with China stall. Markets react.' },
  { src: 'WSJ', color: '#f5a623', age: '12h', text: 'DOGE budget cuts face legal challenge in federal court.' },
]

// ── Relation fallback (Musk ↔ Trump) ─────────────────────────────────────────
export interface DemoRelation {
  type: string
  strength: string
  score: number
  strengthPct: number
  riskScore: number
  severity: string
  analysis: string
  powerDynamic: string
  levers: { text: string; color: string }[]
  risks: { text: string; color: string }[]
  timelines: { badge: string; badgeColor: string; age: string; text: string; pct: number; color: string }[]
  shared: { initials: string; name: string; type: string; color: string }[]
  cascade: { exposed: string; sectors: number; countries: string; hops: string }
}

export const elonTrumpRelation: DemoRelation = {
  type:        'ALLIED',
  strength:    'CRITICAL',
  score:       9.2,
  strengthPct: 92,
  riskScore:   2.4,
  severity:    'MEDIUM',
  analysis:
    "Musk serves as senior advisor to the Trump administration via DOGE (Department of Government " +
    "Efficiency). This alliance grants Musk unprecedented access to federal policy — particularly " +
    "defense procurement, space contracts, and AI regulation. The relationship is mutually " +
    "reinforcing: Trump gains Musk's platform and industrial capacity, Musk gains regulatory " +
    "favor for Tesla, SpaceX, and xAI.",
  powerDynamic:
    "Asymmetric: Trump holds formal state power, Musk holds industrial and platform power. " +
    "Neither can fully constrain the other. However, Musk's China exposure (Tesla Shanghai) " +
    "creates a structural vulnerability that Trump can exploit via trade policy.",
  levers: [
    { text: 'Defense procurement — SpaceX Starshield, Pentagon launch monopoly', color: '#00e5ff' },
    { text: 'EV tariff policy — Tesla China vs trade war escalation',             color: '#00e5ff' },
    { text: 'AI regulation — xAI competitive advantage over Google/OpenAI',       color: '#00e5ff' },
    { text: 'Government efficiency — DOGE advisory and federal contracts',         color: '#00e5ff' },
  ],
  risks: [
    { text: 'Congressional oversight of DOGE advisory role',                         color: '#e53935' },
    { text: 'Tesla brand damage in European markets from political association',      color: '#f5a623' },
    { text: "Tesla Shanghai dependency conflicts with Trump's trade war",             color: '#e53935' },
  ],
  timelines: [
    { badge: 'POLICY',  badgeColor: 'red',    age: '2d ago', text: 'DOGE advisory role under congressional review',  pct: 41, color: '#e53935' },
    { badge: 'TRADE',   badgeColor: 'teal',   age: '5d ago', text: 'EV tariff exemption for Tesla in trade deal package', pct: 67, color: '#00e5ff' },
    { badge: 'DEFENSE', badgeColor: 'purple', age: '1w ago', text: 'SpaceX Starshield contract renewal — Pentagon priority', pct: 82, color: '#a855f7' },
  ],
  shared: [
    { initials: 'JP', name: 'Jerome Powell', type: 'Musk: Monitors · Trump: Pressures',         color: '#00e5ff' },
    { initials: 'XJ', name: 'Xi Jinping',    type: 'Musk: Depends (Shanghai) · Trump: Trade War', color: '#e53935' },
    { initials: 'NV', name: 'NVIDIA',        type: 'Musk: Partners (xAI) · Trump: Export Controls', color: '#f5a623' },
  ],
  cascade: { exposed: '$2.1T', sectors: 4, countries: 'USA, CHN, DEU', hops: '3 hops' },
}

// ── Trump ideology scores (for NodeInfoPanel) ─────────────────────────────────
export interface DemoIdeologyScore {
  label: string
  value: string
  pct: number
  color: string
  sub: string
}

export const trumpIdeologyScores: DemoIdeologyScore[] = [
  { label: 'EconScore', value: '+5.8', pct: 29, color: '#00e5ff', sub: 'Tax cuts · Deregulation · Free market' },
  { label: 'GeoScore',  value: '+7.2', pct: 36, color: '#f5a623', sub: 'Interventionist · Tariff hawk · Isolationist' },
  { label: 'AuthScore', value: '+4.0', pct: 20, color: '#e53935', sub: '' },
]

// ── Trump structural edges (for NodeInfoPanel) ────────────────────────────────
export interface DemoEdge {
  color: string
  type: string
  target: string
  strength: string
}

export const trumpStructuralEdges: DemoEdge[] = [
  { color: '#00d4aa', type: 'Allied',    target: 'Elon Musk',   strength: 'CRITICAL' },
  { color: '#e53935', type: 'Pressures', target: 'Fed Reserve', strength: 'HIGH'     },
  { color: '#f5a623', type: 'Governs',   target: 'US Military', strength: 'HIGH'     },
]

// ── Fallback neighbors — used when API is unavailable ─────────────────────────
export const fallbackNeighbors: NeighborsResponse = {
  centralNodeId: 'person:7',
  nodes: [
    { nodeId: 'person:173', name: 'Donald Trump',  type: 'person',  compositeScore: 76 },
    { nodeId: 'person:1',   name: 'Jensen Huang',  type: 'person',  compositeScore: 84 },
    { nodeId: 'person:192', name: 'Jerome Powell', type: 'person',  compositeScore: 62 },
    { nodeId: 'person:75',  name: 'Larry Fink',    type: 'person',  compositeScore: 58 },
    { nodeId: 'company:1',  name: 'Tesla',         type: 'company', compositeScore: 91 },
    { nodeId: 'company:2',  name: 'SpaceX',        type: 'company', compositeScore: 88 },
    { nodeId: 'company:3',  name: 'NVIDIA',        type: 'company', compositeScore: 95 },
    { nodeId: 'country:1',  name: 'USA',           type: 'country', compositeScore: 99 },
    { nodeId: 'country:2',  name: 'China',         type: 'country', compositeScore: 97 },
  ],
  edges: [
    { sourceNodeId: 'person:7',  targetNodeId: 'person:173', edgeType: 'Influences', strength: 'Critical' },
    { sourceNodeId: 'person:7',  targetNodeId: 'company:1',  edgeType: 'Owns',       strength: 'Critical' },
    { sourceNodeId: 'person:7',  targetNodeId: 'company:2',  edgeType: 'Owns',       strength: 'Critical' },
    { sourceNodeId: 'person:7',  targetNodeId: 'person:1',   edgeType: 'Partners',   strength: 'High'     },
    { sourceNodeId: 'person:7',  targetNodeId: 'company:3',  edgeType: 'Supplies',   strength: 'High'     },
    { sourceNodeId: 'person:7',  targetNodeId: 'country:1',  edgeType: 'Governs',    strength: 'High'     },
    { sourceNodeId: 'company:1', targetNodeId: 'country:2',  edgeType: 'Exports',    strength: 'High'     },
    { sourceNodeId: 'person:192',targetNodeId: 'person:7',   edgeType: 'Regulates',  strength: 'Medium'   },
  ],
}
