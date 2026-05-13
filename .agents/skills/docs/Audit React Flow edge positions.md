const nodeTypes = useMemo(() => ({ 
  entity: EntityNode, 
  center: CenterNode, 
  relationPanel: RelationPanel 
}), [])

const edgeTypes = useMemo(() => ({ 
  glow: GlowEdge 
}), [])
