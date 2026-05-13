import { motion } from 'framer-motion'
import { AppActor } from '@/app/app.machine'
import { SEARCH_THEMES } from '@/components/TopBar/searchThemes'
import './gold-overlay.scss'

export function PowerMapsPanel() {
  const actor = AppActor.useActorRef()
  const query = AppActor.useSelector((s) => s.context.query)

  // Unified dispatch for ALL powermap items (no special-case). URL becomes
  // `?overlay=powermap&powermapId=X`; PowerMapOverlayHost dispatches the
  // render based on atlasView + config.networkComponent. Globe layers + flyTo
  // come from AppShell's URL-driven useEffect, so the user staying on the
  // current tab (Globe or Network) controls what they see.
  const handleSelect = (theme: typeof SEARCH_THEMES[0]) => {
    actor.send({ type: 'OPEN_POWERMAP', id: theme.id })
  }

  return (
    <motion.div
      className="pm__card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="pm__header">Power Maps</div>
      {SEARCH_THEMES.map((theme, i) => {
        const isActive = query.trim().toLowerCase() === theme.label.toLowerCase()
        return (
          <motion.button
            key={theme.id}
            type="button"
            className={`pm__item${isActive ? ' pm__item--active' : ''}`}
            style={{ borderLeftColor: theme.accent }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.1 + i * 0.06, ease: 'easeOut' }}
            onClick={() => handleSelect(theme)}
          >
            <div
              className="pm__dot"
              style={{ backgroundColor: theme.accent, boxShadow: `0 0 6px ${theme.accent}` }}
            />
            <div className="pm__content">
              <div className="pm__name">{theme.label}</div>
              <div className="pm__category">{theme.category}</div>
            </div>
          </motion.button>
        )
      })}
    </motion.div>
  )
}
