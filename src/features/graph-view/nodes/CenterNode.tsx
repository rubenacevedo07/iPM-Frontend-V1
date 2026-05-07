import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useGraphHover } from '../contexts/GraphHoverContext'
import type { GraphViewNodeData } from '@/types/graphView'
import styles from './CenterNode.module.scss'

export function CenterNode({ id, data, selected }: NodeProps<Node<GraphViewNodeData>>) {
  const { hoveredNodeId, setHoveredNodeId } = useGraphHover()
  const initials = String(data.label || 'EM').slice(0, 2).toUpperCase()

  const dimmed = hoveredNodeId !== null && hoveredNodeId !== id
  const opacity = dimmed ? 0.22 : 1

  const boxShadow = selected
    ? '0 0 40px rgba(0,229,255,0.7), 0 0 80px rgba(0,229,255,0.2)'
    : '0 0 24px rgba(0,229,255,0.45)'

  const scale = selected ? 'scale(1.05)' : 'scale(1)'

  return (
    <div
      className={styles.wrapper}
      style={{ opacity }}
      onMouseEnter={() => setHoveredNodeId(id)}
      onMouseLeave={() => setHoveredNodeId(null)}
    >
      {/* Radar sweep */}
      <div className={styles.radar} />

      {/* Radar reference rings */}
      <div className={styles.radarRing + ' ' + styles.r1} />
      <div className={styles.radarRing + ' ' + styles.r2} />
      <div className={styles.radarRing + ' ' + styles.r3} />

      {/* Pulse rings */}
      <div className={styles.pulse} />
      <div className={styles.pulse + ' ' + styles.r2} />
      <div className={styles.pulse + ' ' + styles.r3} />

      {/* Ring with gradient */}
      <div className={styles.ring} style={{ boxShadow, transform: scale, transition: 'box-shadow 0.2s ease, transform 0.2s ease' }}>
        <div className={styles.inner}>{initials}</div>
      </div>

      {/* Handles */}
      <Handle type="source" id="src-top" position={Position.Top} className={styles.handle} />
      <Handle type="source" id="src-right" position={Position.Right} className={styles.handle} />
      <Handle type="source" id="src-bottom" position={Position.Bottom} className={styles.handle} />
      <Handle type="source" id="src-left" position={Position.Left} className={styles.handle} />

      {/* Badge */}
      {data.score && <div className={styles.badge}>{String(data.score)}</div>}
    </div>
  )
}
