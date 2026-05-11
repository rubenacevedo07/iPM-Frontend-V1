import type { AtlasView } from '@/types/atlas'
import styles from './AtlasTabs.module.scss'

type TabDef = {
  view: AtlasView | 'timeline'
  label: string
  action?: 'studio-relation'
  disabled?: boolean
}

const TABS: TabDef[] = [
  { view: 'globe',    label: 'Globe'            },
  { view: 'network',  label: 'Network'          },
  { view: 'force',    label: 'Force'            },
  { view: 'timeline', label: 'Studio Relation', action: 'studio-relation' },
]

interface AtlasTabsProps {
  activeView: AtlasView
  onTabClick: (tab: TabDef) => void
}

export function AtlasTabs({ activeView, onTabClick }: AtlasTabsProps) {
  return (
    <div className={styles.tabs}>
      {TABS.map(t => {
        const isActive = t.action !== 'studio-relation' && t.view === activeView
        return (
          <button
            key={t.view}
            className={`${styles.tab}${isActive ? ` ${styles.tabActive}` : ''}${t.disabled ? ` ${styles.tabDisabled}` : ''}`}
            onClick={() => !t.disabled && onTabClick(t)}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
