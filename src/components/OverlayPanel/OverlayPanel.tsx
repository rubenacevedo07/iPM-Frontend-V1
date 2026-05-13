import { motion } from 'framer-motion'
import type { ReactNode, CSSProperties } from 'react'

// OverlayPanel — mandatory wrapper for all overlay panels.
// Using this component is the only way to build an overlay panel.
// It is impossible to forget the animation because the component IS the animation.
//
// Usage:
//   <OverlayPanel dir="left" delay={0} className="gov__panel-wrap">
//     <MyPanel />
//   </OverlayPanel>

type SlideDir = 'left' | 'right' | 'up' | 'down'

interface OverlayPanelProps {
  children:   ReactNode
  dir?:       SlideDir    // direction the panel slides in FROM (default: 'up')
  delay?:     number      // stagger delay in seconds (default: 0)
  style?:     CSSProperties
  className?: string
}

const OFFSET: Record<SlideDir, { x?: number; y?: number }> = {
  left:  { x: -16 },
  right: { x:  16 },
  up:    { y: -12 },
  down:  { y:  12 },
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const

export function OverlayPanel({ children, dir = 'up', delay = 0, style, className }: OverlayPanelProps) {
  const offset = OFFSET[dir]
  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{
        opacity: 0,
        x: offset.x ? offset.x * 0.75 : 0,
        y: offset.y ? offset.y * 0.75 : 0,
      }}
      transition={{ duration: 0.32, ease: EASE, delay }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}
