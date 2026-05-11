import { getBezierPath, BaseEdge, type EdgeProps, type Edge } from '@xyflow/react'
import type { WallStreetEdgeData } from '@/types/wallStreetGraph'

export type WallStreetEdgeDimmedState = 'normal' | 'highlighted' | 'dimmed'

export interface WallStreetEdgeRenderData extends WallStreetEdgeData {
  dimmedState: WallStreetEdgeDimmedState
  isPersistentSelected?: boolean
  straightLine?: boolean
  edgeLabelText?: string
  showLabel?: boolean
}

const TEMPORAL_PENDING_COLOR = '#ffb547'

function withAlpha(hex: string, alphaHex: string): string {
  const clean = hex.startsWith('#') ? hex : `#${hex}`
  if (clean.length === 7) return `${clean}${alphaHex}`
  return clean
}

export function WallStreetGlowEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  style = {},
}: EdgeProps<Edge<WallStreetEdgeRenderData>>) {
  const dimmedState = data?.dimmedState ?? 'normal'
  const isSelected = data?.isPersistentSelected === true
  const isPending = data?.isTemporalPending === true
  const straight = data?.straightLine === true
  const showLabel = data?.showLabel === true && data?.edgeLabelText

  const baseStroke = isPending ? TEMPORAL_PENDING_COLOR : (data?.primaryColor ?? '#00e5ff')
  const strength = data?.strengthValue ?? 0.5
  const widthBase = 1 + strength * 3

  const pendingMul = isPending ? 0.7 : 1

  const baseOpacity =
    dimmedState === 'highlighted'
      ? 1.0 * pendingMul
      : dimmedState === 'dimmed'
        ? 0.08 * pendingMul
        : 0.25 * pendingMul

  const haloOpacity =
    dimmedState === 'highlighted' ? 0.30 : dimmedState === 'dimmed' ? 0 : 0
  const strokeWidth = dimmedState === 'highlighted' ? widthBase + 0.8 : widthBase
  const haloWidth = dimmedState === 'highlighted' ? 6 : 4
  const glowStdDev = dimmedState === 'highlighted' ? 3 : 2

  const filterId = `ws-glow-${id}`

  const [bezierPath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const edgePath = straight
    ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
    : bezierPath

  const dashArray = isPending ? '6 4' : undefined

  const mx = (sourceX + targetX) / 2
  const my = (sourceY + targetY) / 2

  return (
    <g style={{ transition: 'opacity 0.22s ease' }}>
      <defs>
        <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={glowStdDev} result="ws-blurred" />
          <feMerge>
            <feMergeNode in="ws-blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Halo — only when highlighted (no glow on normal/dimmed for cleanliness) */}
      {!straight && haloOpacity > 0 && (
        <path
          d={edgePath}
          style={{
            pointerEvents: 'none',
            stroke: withAlpha(baseStroke, 'cc'),
            strokeWidth: haloWidth,
            opacity: haloOpacity,
            fill: 'none',
            filter: `url(#${filterId})`,
            transition: 'opacity 0.22s ease, stroke-width 0.22s ease',
          }}
        />
      )}

      {/* Actual edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: baseStroke,
          strokeWidth,
          opacity: baseOpacity,
          ...(dashArray ? { strokeDasharray: dashArray } : {}),
          transition: 'opacity 0.22s ease, stroke-width 0.22s ease',
        }}
      />

      {/* Wide invisible click target */}
      <path
        d={edgePath}
        style={{
          stroke: 'transparent',
          strokeWidth: 16,
          fill: 'none',
          cursor: 'pointer',
        }}
      />

      {/* Hover pulse — only on highlighted (and only for non-pending bezier edges) */}
      {dimmedState === 'highlighted' && !isPending && !straight && (
        <path
          d={edgePath}
          style={{
            pointerEvents: 'none',
            stroke: baseStroke,
            strokeWidth: 4,
            opacity: 0,
            fill: 'none',
            animation: 'wsEdgePulse 1.4s ease-out infinite',
          }}
        />
      )}

      {/* Persistent selected pulse */}
      {isSelected && !isPending && !straight && (
        <path
          d={edgePath}
          style={{
            pointerEvents: 'none',
            stroke: baseStroke,
            strokeWidth: 5,
            opacity: 0,
            fill: 'none',
            animation: 'wsEdgeSelectPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Edge label (shown for PassiveMoneyView ownership %) */}
      {showLabel && (
        <g pointerEvents="none">
          <rect
            x={mx - 22}
            y={my - 10}
            width={44}
            height={20}
            rx={3}
            fill="rgba(8, 11, 17, 0.92)"
            stroke={withAlpha(baseStroke, '66')}
            strokeWidth={1}
          />
          <text
            x={mx}
            y={my + 4}
            fill="#e2e8f0"
            fontFamily="JetBrains Mono, monospace"
            fontSize={11}
            fontWeight={600}
            textAnchor="middle"
          >
            {data?.edgeLabelText}
          </text>
        </g>
      )}
    </g>
  )
}
