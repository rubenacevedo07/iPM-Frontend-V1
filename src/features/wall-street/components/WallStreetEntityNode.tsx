import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { WallStreetNodeData } from '@/types/wallStreetGraph'
import styles from './WallStreetEntityNode.module.scss'

export type WallStreetNodeSize = 'xl' | 'lg' | 'md' | 'sm'

export type WallStreetNodeDimmedState = 'normal' | 'highlighted' | 'dimmed'

export interface WallStreetNodeRenderData extends WallStreetNodeData {
  nodeSize: WallStreetNodeSize
  dimmedState: WallStreetNodeDimmedState
  shortLabel?: string
}

interface SizeTokens {
  width: number
  height: number
  padding: string
  avatar: number
  avatarFontSize: number
  labelFontSize: number
  sublabelFontSize: number
  gap: number
}

const SIZE_TOKENS: Record<WallStreetNodeSize, SizeTokens> = {
  xl: { width: 160, height: 70, padding: '10px 14px', avatar: 32, avatarFontSize: 11, labelFontSize: 14, sublabelFontSize: 10, gap: 8 },
  lg: { width: 130, height: 58, padding: '8px 12px',  avatar: 28, avatarFontSize: 11, labelFontSize: 13, sublabelFontSize: 9,  gap: 8 },
  md: { width: 110, height: 48, padding: '6px 10px',  avatar: 24, avatarFontSize: 10, labelFontSize: 12, sublabelFontSize: 9,  gap: 6 },
  sm: { width: 90,  height: 40, padding: '4px 8px',   avatar: 20, avatarFontSize: 9,  labelFontSize: 11, sublabelFontSize: 8,  gap: 6 },
}

const TYPE_GLYPHS: Record<string, string> = {
  country: 'CO',
  place: 'PL',
  bank: 'BK',
  asset_manager: 'AM',
  hedge_fund: 'HF',
  exchange: 'EX',
  regulator: 'RG',
  central_bank: 'CB',
  custodian_bank: 'CU',
  clearing_house: 'CH',
  company: 'CC',
  person: 'PE',
  institution: 'IN',
}

function glyphFor(entityType: string, canonicalName: string): string {
  return TYPE_GLYPHS[entityType] ?? canonicalName.slice(0, 2).toUpperCase()
}

function withAlpha(hex: string, alphaHex: string): string {
  const clean = hex.startsWith('#') ? hex : `#${hex}`
  if (clean.length === 7) return `${clean}${alphaHex}`
  return clean
}

export function WallStreetEntityNode({
  data,
  selected,
}: NodeProps<Node<WallStreetNodeRenderData>>) {
  const tokens = SIZE_TOKENS[data.nodeSize]
  const color = data.primaryClusterColor
  const dimmed = data.dimmedState === 'dimmed'
  const highlighted = data.dimmedState === 'highlighted'

  const opacity = dimmed ? 0.35 : 1
  const borderColor = selected ? '#FF5A00' : color
  const baseGlow = highlighted ? 24 : dimmed ? 0 : 16
  const glowAlpha = highlighted ? 'cc' : '88'
  const boxShadow = selected
    ? `0 0 24px rgba(255,90,0,0.45), 0 8px 32px rgba(0,0,0,0.6)`
    : `0 0 ${baseGlow}px ${withAlpha(color, glowAlpha)}, 0 8px 32px rgba(0,0,0,0.6)`

  const labelText = data.shortLabel ?? data.canonicalName

  return (
    <div
      className={styles.node}
      style={{
        width: tokens.width,
        height: tokens.height,
        padding: tokens.padding,
        opacity,
        border: `1px solid ${borderColor}`,
        boxShadow,
      }}
    >
      <Handle type="target" position={Position.Top}    id="t-t" className={styles.handle} />
      <Handle type="target" position={Position.Right}  id="t-r" className={styles.handle} />
      <Handle type="target" position={Position.Bottom} id="t-b" className={styles.handle} />
      <Handle type="target" position={Position.Left}   id="t-l" className={styles.handle} />
      <Handle type="source" position={Position.Top}    id="s-t" className={styles.handle} />
      <Handle type="source" position={Position.Right}  id="s-r" className={styles.handle} />
      <Handle type="source" position={Position.Bottom} id="s-b" className={styles.handle} />
      <Handle type="source" position={Position.Left}   id="s-l" className={styles.handle} />

      <div className={styles.row} style={{ gap: tokens.gap }}>
        <div
          className={styles.avatar}
          style={{
            width: tokens.avatar,
            height: tokens.avatar,
            background: 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${withAlpha(color, '40')}`,
          }}
        >
          <span
            className={styles.avatarText}
            style={{ color, fontSize: tokens.avatarFontSize }}
          >
            {glyphFor(data.entityType, data.canonicalName)}
          </span>
        </div>
        <div className={styles.text}>
          <div
            className={styles.label}
            style={{ fontSize: tokens.labelFontSize }}
            title={data.canonicalName}
          >
            {labelText}
          </div>
          <div
            className={styles.sublabel}
            style={{ fontSize: tokens.sublabelFontSize }}
          >
            {data.entityType.replace(/_/g, ' ')}
          </div>
        </div>
      </div>
    </div>
  )
}
