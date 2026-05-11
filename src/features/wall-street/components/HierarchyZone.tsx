export interface HierarchyZoneProps {
  y: number
  height: number
  label: string
  color: string
}

function withAlpha(hex: string, alphaHex: string): string {
  const clean = hex.startsWith('#') ? hex : `#${hex}`
  if (clean.length === 7) return `${clean}${alphaHex}`
  return clean
}

export function HierarchyZone({ y, height, label, color }: HierarchyZoneProps) {
  const alpha08 = withAlpha(color, '14')
  const alpha14 = withAlpha(color, '24')
  const alphaLabel = withAlpha(color, '99')

  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 0,
        width: '100%',
        height,
        background: `linear-gradient(90deg, transparent 0%, ${alpha08} 30%, ${alpha08} 70%, transparent 100%)`,
        borderTop: `1px solid ${alpha14}`,
        borderBottom: `1px solid ${alpha14}`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 8,
          left: 24,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: alphaLabel,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  )
}
