import { Link } from '@tanstack/react-router'
import styles from './ModeBackButton.module.scss'

export function ModeBackButton() {
  return (
    <Link to="/wall-street" search={{}} className={styles.backLink}>
      ← Choose another view
    </Link>
  )
}

export function AdvancedLink() {
  return (
    <Link
      to="/wall-street"
      search={{ view: 'advanced' }}
      className={styles.advancedLink}
    >
      Advanced mode →
    </Link>
  )
}
