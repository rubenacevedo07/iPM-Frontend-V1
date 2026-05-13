import { Link } from '@tanstack/react-router'
import { POWER_LAYOUTS, POWER_LAYOUT_ORDER, type PowerLayoutId } from '../layout/layoutRegistry'
import styles from '../modes/didacticView.module.scss'

export interface LayoutSwitcherTabsProps {
  current: PowerLayoutId
}

export function LayoutSwitcherTabs({ current }: LayoutSwitcherTabsProps) {
  return (
    <div className={styles.layoutTabs} role="tablist" aria-label="Graph layout">
      {POWER_LAYOUT_ORDER.map(id => {
        const layout = POWER_LAYOUTS[id]
        const active = current === id
        return (
          <Link
            key={id}
            to="/wall-street"
            search={prev => ({ ...prev, layout: id })}
            className={`${styles.layoutTab}${active ? ' ' + styles.layoutTabActive : ''}`}
            role="tab"
            aria-selected={active}
            title={layout.description}
          >
            {layout.label}
          </Link>
        )
      })}
    </div>
  )
}
