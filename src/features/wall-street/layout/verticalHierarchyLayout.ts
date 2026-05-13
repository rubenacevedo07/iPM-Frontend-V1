import type { WallStreetNodeSize } from '../components/WallStreetEntityNode'
import type { WallStreetNodeData } from '@/types/wallStreetGraph'

export interface HierarchyMeta {
  hierarchyLevel: number
  columnIndex: number
  columnsInLevel: number
  nodeSize: WallStreetNodeSize
}

export interface HierarchyNodeInput extends WallStreetNodeData, HierarchyMeta {}

export interface PositionedHierarchyNode extends HierarchyNodeInput {
  x: number
  y: number
}

export interface LayoutPadding {
  top: number
  bottom: number
  sides: number
}

const NODE_DIMENSIONS: Record<WallStreetNodeSize, { width: number; height: number }> = {
  xl: { width: 160, height: 70 },
  lg: { width: 130, height: 58 },
  md: { width: 110, height: 48 },
  sm: { width: 90,  height: 40 },
}

export function computeVerticalLayout(
  nodes: HierarchyNodeInput[],
  width: number,
  height: number,
  padding: LayoutPadding,
): PositionedHierarchyNode[] {
  if (nodes.length === 0) return []

  const maxLevel = nodes.reduce((max, n) => Math.max(max, n.hierarchyLevel), 0)
  const totalRows = maxLevel + 1
  const usableHeight = height - padding.top - padding.bottom
  const rowHeight = usableHeight / totalRows
  const usableWidth = width - 2 * padding.sides

  return nodes.map(n => {
    const dim = NODE_DIMENSIONS[n.nodeSize]
    const rowCenterY = padding.top + n.hierarchyLevel * rowHeight + rowHeight / 2
    const y = rowCenterY - dim.height / 2

    const columns = Math.max(1, n.columnsInLevel)
    const columnWidth = usableWidth / columns
    const colCenterX = padding.sides + (n.columnIndex + 0.5) * columnWidth
    const x = colCenterX - dim.width / 2

    return { ...n, x, y }
  })
}

export function rowYCenter(
  level: number,
  height: number,
  padding: LayoutPadding,
  totalRows: number,
): number {
  const usableHeight = height - padding.top - padding.bottom
  const rowHeight = usableHeight / totalRows
  return padding.top + level * rowHeight + rowHeight / 2
}

export function rowYRange(
  startLevel: number,
  endLevel: number,
  height: number,
  padding: LayoutPadding,
  totalRows: number,
): { y: number; height: number } {
  const usableHeight = height - padding.top - padding.bottom
  const rowHeight = usableHeight / totalRows
  const y = padding.top + startLevel * rowHeight
  const h = (endLevel - startLevel + 1) * rowHeight
  return { y, height: h }
}
