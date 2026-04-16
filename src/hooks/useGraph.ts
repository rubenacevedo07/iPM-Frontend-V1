import { useState, useEffect, useCallback } from 'react'
import type {
  GraphNodeDetailDto,
  SubgraphDto,
  GraphEdgeDto,
  GraphNodeDto,
  GraphNodeDegreeDto,
  GraphEdgeWithTimelineDto,
  TopNodeDto,
  GraphSearchRequest,
  TopNodesRequest,
} from '@/types/graph'
import { graphService } from '@/services/graphService'

type AsyncState<T> = {
  data:    T | null
  loading: boolean
  error:   string | null
}

function useAsyncState<T>(initialData: T | null = null): AsyncState<T> & {
  setData:    React.Dispatch<React.SetStateAction<T | null>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError:   React.Dispatch<React.SetStateAction<string | null>>
} {
  const [data,    setData]    = useState<T | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  return { data, loading, error, setData, setLoading, setError }
}

export function useGraphNode(nodeId: string | null) {
  const { data, loading, error, setData, setLoading, setError } = useAsyncState<GraphNodeDetailDto>()
  useEffect(() => {
    if (!nodeId) return
    setLoading(true)
    setError(null)
    graphService.getNode(nodeId)
      .then(setData)
      .catch((err: Error) => { console.error('useGraphNode:', err); setError(err.message ?? 'Failed'); setData(null) })
      .finally(() => setLoading(false))
  }, [nodeId])
  return { node: data, loading, error }
}

export function useSubgraph(nodeId: string | null, depth = 1) {
  const { data, loading, error, setData, setLoading, setError } = useAsyncState<SubgraphDto>()
  useEffect(() => {
    if (!nodeId) return
    setLoading(true)
    setError(null)
    graphService.getSubgraph(nodeId, depth as 1 | 2 | 3)
      .then(setData)
      .catch((err: Error) => { console.error('useSubgraph:', err); setError(err.message ?? 'Failed'); setData(null) })
      .finally(() => setLoading(false))
  }, [nodeId, depth])
  return { subgraph: data, loading, error }
}

export function useGraphEdges(nodeId: string | null, edgeType?: string) {
  const { data, loading, error, setData, setLoading, setError } = useAsyncState<GraphEdgeDto[]>([])
  useEffect(() => {
    if (!nodeId) return
    setLoading(true)
    setError(null)
    graphService.getEdges(nodeId, edgeType)
      .then(setData)
      .catch((err: Error) => { console.error('useGraphEdges:', err); setError(err.message ?? 'Failed'); setData([]) })
      .finally(() => setLoading(false))
  }, [nodeId, edgeType])
  return { edges: data ?? [], loading, error }
}

export function useGraphNeighbors(nodeId: string | null, edgeType?: string) {
  const { data, loading, error, setData, setLoading, setError } = useAsyncState<GraphNodeDto[]>([])
  useEffect(() => {
    if (!nodeId) return
    setLoading(true)
    setError(null)
    graphService.getNeighbors(nodeId, edgeType)
      .then(setData)
      .catch((err: Error) => { console.error('useGraphNeighbors:', err); setError(err.message ?? 'Failed'); setData([]) })
      .finally(() => setLoading(false))
  }, [nodeId, edgeType])
  return { neighbors: data ?? [], loading, error }
}

export function useGraphDegree(nodeId: string | null) {
  const { data, loading, error, setData, setLoading, setError } = useAsyncState<GraphNodeDegreeDto>()
  useEffect(() => {
    if (!nodeId) return
    setLoading(true)
    setError(null)
    graphService.getDegree(nodeId)
      .then(setData)
      .catch((err: Error) => { console.error('useGraphDegree:', err); setError(err.message ?? 'Failed'); setData(null) })
      .finally(() => setLoading(false))
  }, [nodeId])
  return { degree: data, loading, error }
}

export function useEdgeTimelines(edgeId: string | null) {
  const { data, loading, error, setData, setLoading, setError } = useAsyncState<GraphEdgeWithTimelineDto>()
  useEffect(() => {
    if (!edgeId) return
    setLoading(true)
    setError(null)
    graphService.getEdgeTimelines(edgeId)
      .then(d => setData(d as unknown as GraphEdgeWithTimelineDto))
      .catch((err: Error) => { console.error('useEdgeTimelines:', err); setError(err.message ?? 'Failed'); setData(null) })
      .finally(() => setLoading(false))
  }, [edgeId])
  return { timeline: data, loading, error }
}

export function useGraphSearch() {
  const { data, loading, error, setData, setLoading, setError } = useAsyncState<GraphNodeDto[]>([])
  const search = useCallback((request: GraphSearchRequest) => {
    setLoading(true)
    setError(null)
    graphService.search(request.query ?? '')
      .then(setData)
      .catch((err: Error) => { console.error('useGraphSearch:', err); setError(err.message ?? 'Search failed'); setData([]) })
      .finally(() => setLoading(false))
  }, [])
  return { results: data ?? [], loading, error, search }
}

export function useTopNodes(request: TopNodesRequest = {}) {
  const { data, loading, error, setData, setLoading, setError } = useAsyncState<TopNodeDto[]>([])
  const { nodeType, sortBy, limit } = request
  useEffect(() => {
    setLoading(true)
    setError(null)
    graphService.getTopNodes()
      .then(nodes => {
        let result = nodes as unknown as TopNodeDto[]
        if (nodeType) result = result.filter((n: TopNodeDto) => n.node.type === nodeType)
        if (limit) result = result.slice(0, limit)
        setData(result)
      })
      .catch((err: Error) => { console.error('useTopNodes:', err); setError(err.message ?? 'Failed'); setData([]) })
      .finally(() => setLoading(false))
  }, [nodeType, sortBy, limit])
  return { topNodes: data ?? [], loading, error }
}
