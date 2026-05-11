// src/components/AtlasViewToggle/AtlasViewToggle.tsx
import { AppActor } from '@/app/app.machine'
import type { AtlasView } from '@/types/atlas'
import styles from './AtlasViewToggle.module.scss'

const VIEWS: { view: AtlasView; label: string }[] = [
  { view: 'globe',   label: 'Globe'   },
  { view: 'network', label: 'Network' },
]

export function AtlasViewToggle() {
  const actor     = AppActor.useActorRef()
  const atlasView = AppActor.useSelector(s => s.context.atlasView)

  return (
    <div className={styles.wrap} role="group" aria-label="Atlas view mode">
      {VIEWS.map(({ view, label }) => (
        <button
          key={view}
          type="button"
          className={`${styles.btn}${atlasView === view ? ` ${styles.btnActive}` : ''}`}
          aria-pressed={atlasView === view}
          onClick={() => actor.send({ type: 'ATLAS_VIEW.SET', view })}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        className={styles.btn}
        onClick={() => actor.send({ type: 'OPEN_PERSON', id: 7 })}
      >
        Demo Person
      </button>
    </div>
  )
}
