import { ModeBackButton, AdvancedLink } from '../components/ModeBackButton'
import styles from './didacticView.module.scss'

export interface ViewHeaderProps {
  title: string
  subtitle: string
}

export function ViewHeader({ title, subtitle }: ViewHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <ModeBackButton />
      </div>
      <div className={styles.headerCenter}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <div className={styles.headerRight}>
        <AdvancedLink />
      </div>
    </header>
  )
}
