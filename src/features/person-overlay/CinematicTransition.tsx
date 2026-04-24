import { useEffect } from 'react'
import type { TransitionScene } from '@/domain/types'
import './person-overlay.scss'

interface CinematicTransitionProps {
  scene: TransitionScene | null
  label: string          // entity name, shown if no scene
  onComplete: () => void
}

export function CinematicTransition({ scene, label, onComplete }: CinematicTransitionProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 800)
    return () => clearTimeout(t)
  }, [onComplete])

  const displayLabel = scene?.label ?? label.toUpperCase()
  const subLabel     = scene?.subLabel ?? ''
  const hasImage     = !!scene?.image

  if (!hasImage) {
    return (
      <div className="cin__root">
        <div className="cin__fallback">
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 42,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.02em',
          }}>
            {displayLabel}
          </span>
          {subLabel && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: '#00e5ff',
              letterSpacing: '0.14em',
            }}>
              {subLabel}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="cin__root">
      <div
        className="cin__bg"
        style={{ backgroundImage: `url(${scene.image})` }}
      />
      <div className="cin__gradient" />
      <div className="cin__scanlines" />
      <div className="cin__label-wrap">
        <div className="cin__label">{displayLabel}</div>
        {subLabel && <div className="cin__sublabel">{subLabel}</div>}
      </div>
    </div>
  )
}
