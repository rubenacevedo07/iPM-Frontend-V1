import { useMemo } from 'react'
import { AppActor } from '@/app/app.machine'
import { SEARCH_THEMES } from '@/components/TopBar/searchThemes'
import styles from './ThemeFloatingPanel.module.scss'

export function ThemeFloatingPanel() {
  const actor = AppActor.useActorRef()
  const query = AppActor.useSelector((s) => s.context.query)

  const activeThemeId = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return SEARCH_THEMES.find((theme) =>
      theme.label.toLowerCase() === normalized || theme.id === normalized,
    )?.id
  }, [query])

  const handleSelectTheme = (themeLabel: string) => {
    actor.send({ type: 'SEARCH_QUERY', q: themeLabel })
    actor.send({ type: 'ATLAS_VIEW.SET', view: 'network' })
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.heading}>Theme selector</div>
          <div className={styles.subheading}>Pick a narrative lens for the graph.</div>
        </div>
      </div>

      <div className={styles.themeList}>
        {SEARCH_THEMES.map((theme) => {
          const isActive = theme.id === activeThemeId || query.trim().toLowerCase() === theme.label.toLowerCase()
          return (
            <button
              key={theme.id}
              type="button"
              className={`${styles.themeItem}${isActive ? ` ${styles.themeItemActive}` : ''}`}
              style={{ borderColor: theme.accent }}
              onClick={() => handleSelectTheme(theme.label)}
            >
              <div className={styles.themeTitle}>{theme.label}</div>
              <div className={styles.themeSubtitle}>{theme.subtitle}</div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
