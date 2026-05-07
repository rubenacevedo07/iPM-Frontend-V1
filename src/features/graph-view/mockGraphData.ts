// src/features/graph-view/mockGraphData.ts
// Static mock data for the graph panel. Matches the GraphSubgraph wire format
// exactly — same pipeline as live API data via normalizeGraphData().
import type { GraphSubgraph } from './graphMapper'
import { normalizeGraphData } from './transformers/normalizeGraphData'

const MOCK_SUBGRAPH: GraphSubgraph = {
  center: {
    NodeId:   'you',
    Label:    'Subject EM',
    Type:     'company',
    DbId:     '0',
    Subtitle: 'Primary Entity',
    Accent:   'primary',
    Score:    'ID-78902',
  },

  nodes: [
    { NodeId: 'company:1',  Label: 'NVIDIA',        Type: 'company', DbId: '1',  Subtitle: 'AI Hardware',    Avatar: 'NV', Accent: 'primary'   },
    { NodeId: 'company:7',  Label: 'Tesla',          Type: 'company', DbId: '7',  Subtitle: 'Auto/Energy',    Avatar: 'TS', Accent: 'warning'   },
    { NodeId: 'company:3',  Label: 'Microsoft',      Type: 'company', DbId: '3',  Subtitle: 'Cloud/AI',       Avatar: 'MS', Accent: 'success'   },
    { NodeId: 'company:96', Label: 'Palantir',       Type: 'company', DbId: '96', Subtitle: 'Data/Analytics', Avatar: 'PL', Accent: 'secondary' },
    { NodeId: 'company:2',  Label: 'Apple',          Type: 'company', DbId: '2',  Subtitle: 'Consumer Tech',  Avatar: 'AP', Accent: 'default'   },
    { NodeId: 'person:7',   Label: 'Elon Musk',      Type: 'person',  DbId: '7',  Subtitle: 'Entrepreneur',   Avatar: 'EM', Accent: 'warning'   },
    { NodeId: 'person:1',   Label: 'Jensen Huang',   Type: 'person',  DbId: '1',  Subtitle: 'CEO NVIDIA',     Avatar: 'JH', Accent: 'primary'   },
  ],

  edges: [
    {
      EdgeId: 'e1', Source: 'you', Target: 'company:1',
      Label: 'GPU Supply', EdgeType: 'Supplies', Strength: 'Critical',
      Direction: '→', Since: '2022-03', Volume: 'USD 4.2B',
      Status: 'Active', StatusType: 'cyan', Flagged: false,
      Color: '#00E5FF', Animated: true,
    },
    {
      EdgeId: 'e2', Source: 'you', Target: 'company:7',
      Label: 'Auto Partnership', EdgeType: 'Partners', Strength: 'High',
      Direction: '↔', Since: '2021-06',
      Status: 'EDD Active', StatusType: 'amber', Flagged: true,
      Color: '#F5A623',
    },
    {
      EdgeId: 'e3', Source: 'you', Target: 'company:3',
      Label: 'AI Collaboration', EdgeType: 'Partners', Strength: 'High',
      Direction: '↔', Since: '2020-11', Volume: 'USD 890M',
      Status: 'Monitoring', StatusType: 'cyan', Flagged: false,
      Color: '#3ECF8E',
    },
    {
      EdgeId: 'e4', Source: 'you', Target: 'company:96',
      Label: 'Data Platform', EdgeType: 'Partners', Strength: 'Medium',
      Direction: '→', Since: '2021-07', Volume: 'EUR 340M',
      Status: 'Vetted', StatusType: 'green', Flagged: false,
      Color: '#94A3B8',
    },
    {
      EdgeId: 'e5', Source: 'you', Target: 'company:2',
      Label: 'Chip Rivalry', EdgeType: 'Competes', Strength: 'Medium',
      Direction: '↔', Since: '2023-01',
      Status: 'Watch', StatusType: 'gray', Flagged: false,
      Color: '#E2E8F0',
    },
    {
      EdgeId: 'e6', Source: 'you', Target: 'person:7',
      Label: 'PEP Linkage', EdgeType: 'Knows', Strength: 'High',
      Direction: '↔', Since: '2017-03',
      Status: 'Inquiry', StatusType: 'amber', Flagged: true,
      Color: '#F5A623',
    },
    {
      EdgeId: 'e7', Source: 'you', Target: 'person:1',
      Label: 'Co-Founder', EdgeType: 'Knows', Strength: 'Critical',
      Direction: '→', Since: '1993-01',
      Status: 'Active Case', StatusType: 'cyan', Flagged: false,
      Color: '#00E5FF', Animated: true,
    },
  ],
}

export const { nodes: MOCK_NODES, edges: MOCK_EDGES } = normalizeGraphData(MOCK_SUBGRAPH)
