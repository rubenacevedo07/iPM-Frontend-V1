import { useRef, useEffect, useCallback } from 'react'
import type { NeighborNode, NeighborEdge, NodeType } from '@/domain/types'
import './person-overlay.scss'

// ── Constants ────────────────────────────────────
const EDGE_COLORS: Record<string, string> = {
  Influences:       '#a855f7',
  Finances:         '#f5a623',
  Owns:             '#00e5ff',
  Competes:         '#a855f7',
  Partners:         '#00d4aa',
  Governs:          '#f5a623',
  Regulates:        '#f5a623',
  Sanctions:        '#e53935',
  Supplies:         '#00e5ff',
  Manufactures:     '#00e5ff',
  DependsOn:        '#e53935',
  Exports:          '#00d4aa',
  MilitaryConflict: '#e53935',
  Distributes:      '#00e5ff',
  Sets:             '#f5a623',
}

// Shape by node type
type Shape = 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon'
const NODE_SHAPES: Record<NodeType, Shape> = {
  person:   'circle',
  company:  'square',
  country:  'diamond',
  theme:    'hexagon',
  scenario: 'triangle',
  org:      'square',
}

const NODE_COLORS: Record<NodeType, string> = {
  person:   '#00d4aa',
  company:  '#00e5ff',
  country:  '#f5a623',
  theme:    '#a855f7',
  scenario: '#e53935',
  org:      '#8a9bb5',
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  x: number,
  y: number,
  r: number,
): void {
  ctx.beginPath()
  switch (shape) {
    case 'circle':
      ctx.arc(x, y, r, 0, Math.PI * 2)
      break
    case 'square': {
      const s = r * 1.5
      ctx.rect(x - s / 2, y - s / 2, s, s)
      break
    }
    case 'diamond': {
      ctx.moveTo(x, y - r * 1.3)
      ctx.lineTo(x + r * 1.1, y)
      ctx.lineTo(x, y + r * 1.3)
      ctx.lineTo(x - r * 1.1, y)
      ctx.closePath()
      break
    }
    case 'triangle': {
      const h = r * 1.6
      ctx.moveTo(x, y - h)
      ctx.lineTo(x + r * 1.3, y + r * 0.8)
      ctx.lineTo(x - r * 1.3, y + r * 0.8)
      ctx.closePath()
      break
    }
    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const px = x + r * 1.1 * Math.cos(angle)
        const py = y + r * 1.1 * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.closePath()
      break
    }
  }
}

interface LayoutNode {
  id: string
  label: string
  type: NodeType
  r: number
  x: number
  y: number
  score: number | null
  isCentral: boolean
  shape: Shape
  color: string
}

function buildLayout(
  centralNodeId: string,
  nodes: NeighborNode[],
  cx: number,
  cy: number,
  maxNodes = 12,
): LayoutNode[] {
  const result: LayoutNode[] = []

  // Central
  result.push({
    id: centralNodeId,
    label: 'ME',
    type: 'person',
    r: 28,
    x: cx,
    y: cy,
    score: null,
    isCentral: true,
    shape: 'circle',
    color: '#00e5ff',
  })

  const limited = nodes.slice(0, maxNodes)
  const angleStep = (Math.PI * 2) / limited.length
  const orbitR = Math.min(cx, cy) * 0.58

  limited.forEach((n, i) => {
    const angle = angleStep * i - Math.PI / 2
    const score = n.compositeScore ?? 50
    const nodeR = 10 + (score / 100) * 10
    result.push({
      id: n.nodeId,
      label: n.name.split(' ').pop() ?? n.name,
      type: n.type,
      r: nodeR,
      x: cx + orbitR * Math.cos(angle),
      y: cy + orbitR * Math.sin(angle),
      score,
      isCentral: false,
      shape: NODE_SHAPES[n.type] ?? 'circle',
      color: NODE_COLORS[n.type] ?? '#8a9bb5',
    })
  })

  return result
}

interface ShapeEgoGraphProps {
  centralNodeId: string
  centralName: string
  nodes: NeighborNode[]
  edges: NeighborEdge[]
  onNodeClick?: (nodeId: string) => void
  selectedNodeId?: string | null
}

export function ShapeEgoGraph({
  centralNodeId,
  centralName,
  nodes,
  edges,
  onNodeClick,
  selectedNodeId,
}: ShapeEgoGraphProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const wrapRef      = useRef<HTMLDivElement>(null)
  const rafRef       = useRef<number>(0)
  const layoutRef    = useRef<LayoutNode[]>([])
  const pulseTimeRef = useRef(0)

  const render = useCallback((ts: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    pulseTimeRef.current = ts

    ctx.clearRect(0, 0, W, H)

    const layout = layoutRef.current
    if (layout.length === 0) return

    const central = layout[0]

    // Orbit rings
    ctx.beginPath()
    ctx.arc(central.x, central.y, Math.min(W, H) * 0.28, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0,229,255,0.04)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(central.x, central.y, Math.min(W, H) * 0.42, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0,229,255,0.025)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Edges
    for (const edge of edges) {
      const src = layout.find(n => n.id === edge.sourceNodeId)
      const tgt = layout.find(n => n.id === edge.targetNodeId)
      if (!src || !tgt) continue

      const color = EDGE_COLORS[edge.edgeType] ?? '#5a6b80'
      const [r, g, b] = parseHex(color)
      const isCritical = edge.strength === 'Critical'
      const alpha = isCritical ? 0.55 : 0.25

      ctx.beginPath()
      ctx.moveTo(src.x, src.y)
      ctx.lineTo(tgt.x, tgt.y)
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.lineWidth = isCritical ? 1.5 : 0.75
      ctx.stroke()

      // Pulse dot on Critical edges only
      if (isCritical) {
        const t = ((ts % 2400) / 2400)
        const px = src.x + (tgt.x - src.x) * t
        const py = src.y + (tgt.y - src.y) * t
        ctx.beginPath()
        ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},0.9)`
        ctx.fill()
      }
    }

    // Nodes
    for (const node of layout) {
      const isSelected = node.id === selectedNodeId
      const isCenter   = node.isCentral

      // Glow for central / selected
      if (isCenter || isSelected) {
        const [r, g, b] = parseHex(node.color)
        const gradient = ctx.createRadialGradient(node.x, node.y, node.r, node.x, node.y, node.r * 3)
        gradient.addColorStop(0, `rgba(${r},${g},${b},0.15)`)
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r * 3, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Breathing animation on central
        if (isCenter) {
          const breathe = 1 + 0.06 * Math.sin(ts / 1000)
          ctx.beginPath()
          ctx.arc(node.x, node.y, node.r * breathe + 5, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      // Shape fill
      const [r, g, b] = parseHex(node.color)
      drawShape(ctx, node.shape, node.x, node.y, node.r)
      ctx.fillStyle = `rgba(${r},${g},${b},0.10)`
      ctx.fill()
      ctx.strokeStyle = isSelected
        ? `rgba(${r},${g},${b},0.9)`
        : `rgba(${r},${g},${b},${isCenter ? 0.8 : 0.5})`
      ctx.lineWidth = isCenter ? 2 : isSelected ? 1.5 : 1
      ctx.stroke()

      // Initials / score inside node
      ctx.fillStyle = isCenter ? '#00e5ff' : node.color
      ctx.font = `700 ${isCenter ? 11 : 9}px 'JetBrains Mono', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (isCenter) {
        ctx.fillText(
          centralName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
          node.x, node.y,
        )
      } else if (node.score != null) {
        ctx.fillText(String(Math.round(node.score)), node.x, node.y)
      }

      // Label below node
      ctx.fillStyle = isSelected ? node.color : 'rgba(138,155,181,0.75)'
      ctx.font = `500 9px 'DM Sans', sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(node.label.slice(0, 10), node.x, node.y + node.r + 3)
    }

    rafRef.current = requestAnimationFrame(render)
  }, [centralName, edges, selectedNodeId])

  // Resize observer — rebuilds layout on every size change and kicks off rAF
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width === 0 || height === 0) continue
        canvas.width  = width
        canvas.height = height
        layoutRef.current = buildLayout(
          centralNodeId, nodes,
          width / 2, height / 2,
        )
        // Start the rAF loop now that we have real dimensions
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(render)
      }
    })
    obs.observe(wrap)
    return () => {
      obs.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [centralNodeId, nodes, render])

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNodeClick) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect  = canvas.getBoundingClientRect()
    const mx    = e.clientX - rect.left
    const my    = e.clientY - rect.top
    const scale = canvas.width / rect.width

    for (const node of layoutRef.current) {
      const dx = mx * scale - node.x
      const dy = my * scale - node.y
      if (Math.sqrt(dx * dx + dy * dy) < node.r + 6) {
        onNodeClick(node.id)
        return
      }
    }
  }, [onNodeClick])

  // Legend items (unique edge types)
  const legendItems = Array.from(
    new Set(edges.map(e => e.edgeType))
  ).slice(0, 5)

  return (
    <div className="eg__canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="eg__canvas"
        onClick={handleClick}
        style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
      />
      {nodes.length === 0 && (
        <div className="eg__loading">LOADING EGO NETWORK…</div>
      )}
      {legendItems.length > 0 && (
        <div className="eg__legend">
          {legendItems.map(type => (
            <div key={type} className="eg__legend-item">
              <div
                className="eg__legend-dot"
                style={{ background: EDGE_COLORS[type] ?? '#5a6b80' }}
              />
              {type.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
