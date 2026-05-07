import { getStraightPath, type EdgeProps } from '@xyflow/react'
import type { Edge } from '@xyflow/react'
import { useGraphHover } from '../contexts/GraphHoverContext'
import { useGraphEdge } from '../contexts/GraphEdgeContext'
import type { GraphViewEdgeData } from '@/types/graphView'

export function GlowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
}: EdgeProps<Edge<GraphViewEdgeData>>) {
  // Offset source position if it's the center node (circular collision detection)
  const CIRCLE_RADIUS = 46
  let sx = sourceX
  let sy = sourceY
  if (source === 'you') {
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 0) {
      sx = sourceX + (dx / dist) * CIRCLE_RADIUS
      sy = sourceY + (dy / dist) * CIRCLE_RADIUS
    }
  }

  const [edgePath] = getStraightPath({ sourceX: sx, sourceY: sy, targetX, targetY })
  const { hoveredNodeId } = useGraphHover()
  const { selectedEdgeId } = useGraphEdge()

  const color = (data?.color as string) ?? '#FFFFFF'
  const isDashed = (data?.dashed as boolean) ?? false
  const isAnimated = (data?.animated as boolean) ?? false
  const isRing2 = (data?.ring2Edge as boolean) ?? false
  const filterId = `glow-${id}`

  const isSelected = selectedEdgeId === id
  const isAnySelected = selectedEdgeId !== null
  const isActive = !isAnySelected && hoveredNodeId !== null && (source === hoveredNodeId || target === hoveredNodeId)
  const isDimmedEdge = !isAnySelected && hoveredNodeId !== null && !isActive
  const isDimmedBySelection = isAnySelected && !isSelected

  const baseOpacity = isSelected ? 1.0 : isDimmedBySelection ? 0.18 : isDimmedEdge ? 0.15 : isActive ? 0.92 : isRing2 ? 0.55 : 0.85
  const haloOpacity = isSelected ? 0.3 : isDimmedBySelection || isDimmedEdge ? 0 : isActive ? 0.2 : isRing2 ? 0.05 : 0.1
  const strokeWidth = isSelected ? (isRing2 ? 2.5 : 3.2) : isActive ? (isRing2 ? 1.8 : 2.2) : isRing2 ? 1.0 : 1.5
  const haloWidth = isSelected ? 8 : isActive ? 6 : 4
  const glowStdDev = isSelected ? 4 : isActive ? 3 : 2
  const effectiveDashed = isDashed

  return (
    <g style={{ transition: 'opacity 0.22s ease', cursor: 'pointer' }}>
      <defs>
        <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={glowStdDev} result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Halo */}
      <path
        d={edgePath}
        style={{
          stroke: color,
          strokeWidth: haloWidth,
          opacity: haloOpacity,
          fill: 'none',
          filter: `url(#${filterId})`,
          transition: 'opacity 0.22s ease, stroke-width 0.22s ease',
        }}
      />

      {/* Main line */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          ...style,
          strokeWidth,
          stroke: color,
          opacity: baseOpacity,
          fill: 'none',
          ...(effectiveDashed ? { strokeDasharray: isRing2 ? '4 8' : '6 6' } : {}),
          transition: 'opacity 0.22s ease, stroke-width 0.22s ease',
        }}
      />

      {/* Click target invisible (ancho para facilitar click) */}
      <path d={edgePath} style={{ stroke: 'transparent', strokeWidth: 16, fill: 'none', cursor: 'pointer' }} />

      {/* Partículas (solo ring-1 animated) */}
      {isAnimated && !isDimmedEdge && !isDimmedBySelection && !isRing2 && (
        <path
          d={edgePath}
          pathLength={1}
          style={{
            stroke: color,
            strokeWidth: isActive ? 4 : 3,
            opacity: isActive ? 1 : 0.9,
            fill: 'none',
            strokeDasharray: '0.05 1',
            animation: 'singleParticle 2s linear infinite',
          }}
        />
      )}

      {/* Pulso en arista activa (hover) */}
      {isActive && (
        <path
          d={edgePath}
          style={{
            stroke: color,
            strokeWidth: 4,
            opacity: 0,
            fill: 'none',
            animation: 'edgePulse 1.4s ease-out infinite',
          }}
        />
      )}

      {/* Pulso en arista seleccionada */}
      {isSelected && (
        <path
          d={edgePath}
          style={{
            stroke: color,
            strokeWidth: 5,
            opacity: 0,
            fill: 'none',
            animation: 'edgeSelectPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Midpoint dot cuando seleccionada */}
      {isSelected && (() => {
        const mx = (sx + targetX) / 2
        const my = (sy + targetY) / 2
        return (
          <circle
            cx={mx}
            cy={my}
            r={4}
            fill={color}
            opacity={0.9}
            filter={`url(#${filterId})`}
            style={{ animation: 'edgeSelectPulse 2s ease-in-out infinite' }}
          />
        )
      })()}
    </g>
  )
}
