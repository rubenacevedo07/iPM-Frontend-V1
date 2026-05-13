import { AppActor } from '@/app/app.machine'
import { SEARCH_THEMES } from '@/components/TopBar/searchThemes'
import styles from './ThemeLeftPanel.module.scss'

export function ThemeLeftPanel() {
  const actor = AppActor.useActorRef()
  const query = AppActor.useSelector((s) => s.context.query)

  const activeThemeId = SEARCH_THEMES.find((theme) =>
    theme.label.toLowerCase() === query.trim().toLowerCase() ||
    theme.id === query.trim().toLowerCase(),
  )?.id

  const handleSelectTheme = (themeLabel: string) => {
    actor.send({ type: 'SEARCH_QUERY', q: themeLabel })
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>Theme Navigator</div>
        <div className={styles.subtitle}>Select a lens to explore global networks</div>
      </div>

      <div className={styles.divider} />

      {/* Theme List */}
      <div className={styles.themeList}>
        {SEARCH_THEMES.map((theme) => {
          const isActive = theme.id === activeThemeId || query.trim().toLowerCase() === theme.label.toLowerCase()
          return (
            <button
              key={theme.id}
              type="button"
              className={`${styles.themeRow}${isActive ? ` ${styles.themeRowActive}` : ''}`}
              onClick={() => handleSelectTheme(theme.label)}
              style={
                isActive
                  ? {
                      background: `rgba(255, 255, 255, 0.04)`,
                      borderLeft: `3px solid ${theme.accent}`,
                    }
                  : {}
              }
            >
              <div className={styles.themeDot} style={{ background: theme.accent }} />
              <div className={styles.themeContent}>
                <div className={styles.themeName}>{theme.label}</div>
                <div className={styles.themeCategory}>{theme.category}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div className={styles.divider} />

      {/* Active Theme Details */}
      {activeThemeId && (
        <div className={styles.activeThemeDetails}>
          <div className={styles.sectionLabel}>Active Theme</div>
          {(() => {
            const active = SEARCH_THEMES.find((t) => t.id === activeThemeId)
            if (!active) return null
            return (
              <>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Narrative</span>
                  <span className={styles.detailValue}>{active.subtitle}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Category</span>
                  <span className={styles.detailBadge} style={{ borderColor: active.accent }}>
                    {active.category}
                  </span>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
