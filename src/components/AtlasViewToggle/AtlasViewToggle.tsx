import { Globe2, Network, Users, Waypoints } from 'lucide-react'
import { AppActor } from '@/app/AppProviders'
import type { AtlasView } from '@/types/atlas'
import styles from './AtlasViewToggle.module.scss'

const VIEWS: { view: AtlasView; icon: React.ReactNode; label: string }[] = [
  { view: 'globe',   icon: <Globe2  size={16} />, label: 'Globe'   },
  { view: 'network', icon: <Network size={16} />, label: 'Graph'   },
  { view: 'persons',  icon: <Users     size={16} />, label: 'Persons'  },
  { view: 'relation', icon: <Waypoints size={16} />, label: 'Relation' },
]

export function AtlasViewToggle() {
  const appRef    = AppActor.useActorRef()
  const atlasView = AppActor.useSelector(s => s.context.atlasView)

  return (
    <div className={styles.hud} role="toolbar" aria-label="Atlas view switcher">
      {VIEWS.map(({ view, icon, label }) => (
        <button
          key={view}
          className={`${styles.btn}${atlasView === view ? ` ${styles.btnActive}` : ''}`}
          onClick={() => appRef.send({ type: 'ATLAS_VIEW.SET', view })}
          aria-pressed={atlasView === view}
        >
          {icon}
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </div>
  )
}
