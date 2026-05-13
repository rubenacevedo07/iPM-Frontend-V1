import type { CSSProperties } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useGraphHover } from '@/features/graph-view/contexts/GraphHoverContext'
import type { SugiyamaNodeData } from '@/types/_ext/sugiyamaGraph'

const HANDLE_STYLE: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'rgba(0,229,255,0.3)',
  border: '1px solid rgba(0,229,255,0.5)',
  opacity: 0,
}

export function SugiyamaNode({ id, data }: NodeProps<Node<SugiyamaNodeData>>) {
  const { hoveredNodeId, connectedNodeIds, setHoveredNodeId } = useGraphHover()
  const dimmed = hoveredNodeId !== null && hoveredNodeId !== id && !connectedNodeIds.has(id)
  const opacity = dimmed ? 0.22 : 1
  const c = data.borderColor

  return (
    <div
      style={{
        height:       40,
        width:        data.nodeWidth,
        opacity,
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        padding:      '0 10px',
        background:   'rgba(10, 14, 20, 0.94)',
        border:       `1px solid ${c}`,
        borderRadius: 6,
        boxShadow:    dimmed ? 'none' : `0 0 10px ${c}33`,
        cursor:       'pointer',
        transition:   'opacity 0.22s ease, box-shadow 0.22s ease',
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={() => setHoveredNodeId(id)}
      onMouseLeave={() => setHoveredNodeId(null)}
    >
      <Handle type="target" position={Position.Top}    id="tgt-top"    style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="src-bottom" style={HANDLE_STYLE} />

      <div style={{
        minWidth:       22,
        height:         22,
        borderRadius:   4,
        background:     `${c}18`,
        border:         `1px solid ${c}40`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontFamily:     'Rajdhani, sans-serif',
        fontSize:       10,
        fontWeight:     700,
        color:          c,
        flexShrink:     0,
      }}>
        {data.initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily:    'Rajdhani, sans-serif',
          fontSize:      12,
          fontWeight:    700,
          color:         '#e2e8f0',
          whiteSpace:    'nowrap',
          overflow:      'hidden',
          textOverflow:  'ellipsis',
          lineHeight:    1.2,
        }}>
          {data.label}
        </div>
        <div style={{
          fontFamily:   'DM Mono, monospace',
          fontSize:     8,
          color:        '#64748b',
          whiteSpace:   'nowrap',
          letterSpacing: '0.04em',
          lineHeight:   1.2,
        }}>
          {data.typeLabel}
        </div>
      </div>
    </div>
  )
}
