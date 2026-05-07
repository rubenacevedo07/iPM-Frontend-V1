import type { NodeProps, Node } from '@xyflow/react'

const STATUS_CLR: Record<string, { text: string; bg: string; border: string }> = {
  cyan: { text: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.3)' },
  green: { text: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
  amber: { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  yellow: { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
  gray: { text: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.22)' },
}

const STRENGTH_CLR: Record<string, string> = {
  Critical: '#f59e0b',
  High: '#f59e0b',
  Medium: '#22d3ee',
  Low: '#22c55e',
}

export function RelationPanel({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const edgeColor = (data?.color as string) ?? '#94a3b8'
  const relType = (data?.relType as string) ?? 'Relation'
  const direction = (data?.direction as string) ?? '→'
  const sourceLabel = (data?.sourceLabel as string) ?? '—'
  const targetLabel = (data?.targetLabel as string) ?? '—'
  const since = (data?.since as string) ?? '—'
  const volume = data?.volume as string | undefined
  const status = (data?.status as string) ?? '—'
  const statusType = (data?.statusType as string) ?? 'gray'
  const flagged = (data?.flagged as boolean) ?? false
  const strength = (data?.strength as string) ?? 'Medium'

  const statusClr = STATUS_CLR[statusType]
  const strengthClr = STRENGTH_CLR[strength]

  return (
    <div
      style={{
        width: 252,
        background: '#080d14',
        border: `1px solid ${edgeColor}55`,
        borderRadius: 8,
        boxShadow: `0 12px 40px rgba(0,0,0,0.8), 0 0 30px ${edgeColor}18`,
        overflow: 'hidden',
        position: 'relative',
        animation: 'miniPanelIn 0.28s cubic-bezier(0.16,1,0.3,1)',
        fontFamily: 'DM Mono, monospace',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${edgeColor}, transparent)`,
          opacity: 0.7,
        }}
      />

      {/* Relation type header */}
      <div
        style={{
          padding: '10px 14px 8px',
          borderBottom: `1px solid ${edgeColor}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `${edgeColor}08`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Decorative lines flanking rel type */}
          <div style={{ width: 16, height: 1, background: `${edgeColor}60` }} />
          <span
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              color: edgeColor,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {relType}
          </span>
          <div style={{ width: 16, height: 1, background: `${edgeColor}60` }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {flagged && (
            <div
              style={{
                fontSize: 7,
                letterSpacing: '0.12em',
                color: '#f59e0b',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 3,
                padding: '1px 5px',
                textTransform: 'uppercase',
              }}
            >
              ⚑ FLAGGED
            </div>
          )}
          <div
            style={{
              fontSize: 7,
              letterSpacing: '0.12em',
              color: strengthClr,
              background: `${strengthClr}12`,
              border: `1px solid ${strengthClr}33`,
              borderRadius: 3,
              padding: '1px 5px',
              textTransform: 'uppercase',
            }}
          >
            {strength}
          </div>
        </div>
      </div>

      {/* Direction row */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 11,
            color: '#cbd5e1',
            fontWeight: 500,
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sourceLabel}
        </span>
        <span
          style={{
            fontSize: 14,
            color: edgeColor,
            opacity: 0.9,
            flexShrink: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {direction}
        </span>
        <span
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 11,
            color: '#cbd5e1',
            fontWeight: 500,
            flex: 1,
            textAlign: 'right',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {targetLabel}
        </span>
      </div>

      {/* Metrics row */}
      <div
        style={{
          padding: '7px 14px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {/* Since */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 7, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            SINCE
          </span>
          <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.04em' }}>{since}</span>
        </div>

        {/* Volume */}
        {volume && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
            <span style={{ fontSize: 7, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              VOLUME
            </span>
            <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.04em' }}>{volume}</span>
          </div>
        )}

        {/* Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
          <span style={{ fontSize: 7, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            STATUS
          </span>
          <span
            style={{
              fontSize: 7,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: statusClr.text,
              background: statusClr.bg,
              border: `1px solid ${statusClr.border}`,
              borderRadius: 3,
              padding: '1px 5px',
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Downward tail pointer */}
      <div
        style={{
          position: 'absolute',
          bottom: -7,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: 12,
          height: 12,
          background: '#080d14',
          borderRight: `1px solid ${edgeColor}44`,
          borderBottom: `1px solid ${edgeColor}44`,
        }}
      />
    </div>
  )
}
