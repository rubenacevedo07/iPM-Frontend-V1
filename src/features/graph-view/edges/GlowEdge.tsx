import { getBezierPath, BaseEdge, type EdgeProps } from '@xyflow/react'
import type { Edge } from '@xyflow/react'
import { useGraphHover } from '../contexts/GraphHoverContext'
import { useGraphEdge } from '../contexts/GraphEdgeContext'
import type { GraphViewEdgeData, EdgeVariant } from '@/types/graphView'
import { resolveEdgeStyle } from '../config/edgeVariants'

export function GlowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style = {},
  data,
}: EdgeProps<Edge<GraphViewEdgeData>>) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const { hoveredNodeId } = useGraphHover()
  const { selectedEdgeId } = useGraphEdge()

  const { stroke, glow } = resolveEdgeStyle(
    data?.variant as EdgeVariant | undefined,
    data?.color as string | undefined,
  )
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

  const mx = (sourceX + targetX) / 2
  const my = (sourceY + targetY) / 2

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

      {/* Halo — decorative only, never intercepts pointer events */}
      <path
        d={edgePath}
        style={{
          pointerEvents: 'none',
          stroke: glow,
          strokeWidth: haloWidth,
          opacity: haloOpacity,
          fill: 'none',
          filter: `url(#${filterId})`,
          transition: 'opacity 0.22s ease, stroke-width 0.22s ease',
        }}
      />

      {/* Actual edge — React Flow native lifecycle */}
      <BaseEdge
        id={id}
        path={edgePath}

        style={{
          ...style,
          stroke,
          strokeWidth,
          opacity: baseOpacity,
          ...(effectiveDashed ? { strokeDasharray: isRing2 ? '4 8' : '6 6' } : {}),
          transition: 'opacity 0.22s ease, stroke-width 0.22s ease',
        }}
      />

      {/* Click target — wide invisible path for easy interaction */}
      <path d={edgePath} style={{ stroke: 'transparent', strokeWidth: 16, fill: 'none', cursor: 'pointer' }} />

      {/* Particles (ring-1 animated edges only) */}
      {isAnimated && !isDimmedEdge && !isDimmedBySelection && !isRing2 && (
        <path
          d={edgePath}
          pathLength={1}
          style={{
            pointerEvents: 'none',
            stroke,
            strokeWidth: isActive ? 4 : 3,
            opacity: isActive ? 1 : 0.9,
            fill: 'none',
            strokeDasharray: '0.05 1',
            animation: 'singleParticle 2s linear infinite',
          }}
        />
      )}

      {/* Pulse on hover */}
      {isActive && (
        <path
          d={edgePath}
          style={{
            pointerEvents: 'none',
            stroke,
            strokeWidth: 4,
            opacity: 0,
            fill: 'none',
            animation: 'edgePulse 1.4s ease-out infinite',
          }}
        />
      )}

      {/* Pulse on selection */}
      {isSelected && (
        <path
          d={edgePath}
          style={{
            pointerEvents: 'none',
            stroke,
            strokeWidth: 5,
            opacity: 0,
            fill: 'none',
            animation: 'edgeSelectPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Midpoint dot when selected */}
      {isSelected && (
        <circle
          cx={mx}
          cy={my}
          r={4}
          fill={stroke}
          opacity={0.9}
          filter={`url(#${filterId})`}
          style={{ pointerEvents: 'none', animation: 'edgeSelectPulse 2s ease-in-out infinite' }}
        />
      )}
    </g>
  )
}
