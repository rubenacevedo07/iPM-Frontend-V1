import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useGraphHover } from '../contexts/GraphHoverContext'
import { getTypeAccent } from '../layout/orbitalLayout'
import type { GraphViewNodeData } from '@/types/graphView'
import styles from './EntityNode.module.scss'

export function EntityNode({ id, data, selected }: NodeProps<Node<GraphViewNodeData>>) {
  const { hoveredNodeId, connectedNodeIds, setHoveredNodeId } = useGraphHover()
  const accent = getTypeAccent(data.accent)

  const dimmed = hoveredNodeId !== null && hoveredNodeId !== id && !connectedNodeIds.has(id)
  const opacity = dimmed ? 0.22 : 1

  const borderColor = selected ? '#FF5A00' : accent.color
  const boxShadow = selected
    ? `0 0 24px rgba(255,90,0,0.45), 0 8px 32px rgba(0,0,0,0.6)`
    : `0 0 ${dimmed ? 0 : 16}px ${accent.glow}, 0 8px 32px rgba(0,0,0,0.6)`

  return (
    <div
      className={styles.node}
      style={{ opacity, border: `1px solid ${borderColor}`, boxShadow }}
      onMouseEnter={() => setHoveredNodeId(id)}
      onMouseLeave={() => setHoveredNodeId(null)}
    >
      <Handle type="target" position={Position.Top} id="tgt-top" className={styles.handle} />
      <Handle type="target" position={Position.Left} id="tgt-left" className={styles.handle} />
      <Handle type="source" position={Position.Bottom} id="src-bottom" className={styles.handle} />
      <Handle type="source" position={Position.Right} id="src-right" className={styles.handle} />

      <div className={styles.row}>
        {/* Avatar or icon */}
        <div className={styles.avatar} style={{ background: accent.bg, border: `1px solid ${accent.color}40` }}>
          {data.avatar ? (
            <span className={styles.avatarText} style={{ color: accent.color }}>
              {String(data.avatar)}
            </span>
          ) : (
            <span className={styles.avatarIcon} style={{ color: accent.color }}>
              ●
            </span>
          )}
        </div>
        <div className={styles.text}>
          <div className={styles.label}>{String(data.label)}</div>
          {data.sublabel && <div className={styles.sublabel}>{String(data.sublabel)}</div>}
        </div>
      </div>

      {data.score && (
        <div className={styles.badge} style={{ color: accent.color, background: accent.bg, border: `1px solid ${accent.color}40` }}>
          {String(data.score)}
        </div>
      )}
    </div>
  )
}
