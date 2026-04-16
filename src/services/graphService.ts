// src/services/graphService.ts
import { API_COMPANIES } from '@/config/apiConfig'
import type {
  GraphNodeDetailDto,
  GraphNodeDegreeDto,
  GraphNodeDto,
  GraphEdgeDto,
  GraphEdgeWithTimelineDto,
  SubgraphDto,
  EdgeRiskDto,
} from '@/types/graph'

const BASE = `${API_COMPANIES}/graph`

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`[graphService] ${res.status} ${res.statusText} — ${url}`)
  return res.json()
}

export const graphService = {
  getNode(nodeId: string): Promise<GraphNodeDetailDto> {
    return get(`${BASE}/node/${encodeURIComponent(nodeId)}`)
  },
  getNodeDetail(nodeId: string): Promise<GraphNodeDetailDto> {
    return get(`${BASE}/node/${encodeURIComponent(nodeId)}`)
  },
  getDegree(nodeId: string): Promise<GraphNodeDegreeDto> {
    return get(`${BASE}/node/${encodeURIComponent(nodeId)}/degree`)
  },
  getNeighbors(nodeId: string, edgeType?: string): Promise<GraphNodeDto[]> {
    const qs = edgeType ? `?edgeType=${encodeURIComponent(edgeType)}` : ''
    return get(`${BASE}/node/${encodeURIComponent(nodeId)}/neighbors${qs}`)
  },
  getEdges(nodeId: string, edgeType?: string): Promise<GraphEdgeDto[]> {
    const qs = edgeType ? `?edgeType=${encodeURIComponent(edgeType)}` : ''
    return get(`${BASE}/node/${encodeURIComponent(nodeId)}/edges${qs}`)
  },
  getSubgraph(nodeId: string, depth: 1 | 2 | 3 = 2): Promise<SubgraphDto> {
    return get(`${BASE}/node/${encodeURIComponent(nodeId)}/subgraph?depth=${depth}`)
  },
  getNodeTimelines(nodeId: string): Promise<GraphEdgeWithTimelineDto[]> {
    return get(`${BASE}/node/${encodeURIComponent(nodeId)}/timelines`)
  },
  getEdgeRisk(nodeId: string): Promise<EdgeRiskDto[]> {
    return get(`${BASE}/node/${encodeURIComponent(nodeId)}/edge-risk`)
  },
  getEdgeTimelines(edgeId: string): Promise<GraphEdgeWithTimelineDto[]> {
    return get(`${BASE}/edge/${encodeURIComponent(edgeId)}/timelines`)
  },
  search(query: string): Promise<GraphNodeDto[]> {
    return get(`${BASE}/search?q=${encodeURIComponent(query)}`)
  },
  getTopNodes(): Promise<GraphNodeDto[]> {
    return get(`${BASE}/top-nodes`)
  },
}
