import { useState, useMemo } from 'react'
import { AppActor } from '@/app/app.machine'
import { useSearch } from '@tanstack/react-router'
import { useCompanies } from '@/hooks/useCompanies'
import styles from './TopBar.module.scss'

export function TopBar() {
  const actor  = AppActor.useActorRef()
  const search = useSearch({ from: '/workstation' })
  const { companies } = useCompanies()

  const [searchVal, setSearchVal]   = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const MAX_RESULTS = 6
  const suggestions = useMemo(() => {
    const q = searchVal.trim().toLowerCase()
    if (!q) return []
    return companies
      .filter(c => c.name.toLowerCase().includes(q))
      .sort((a, b) => (b.marketCapUsd ?? -1) - (a.marketCapUsd ?? -1))
      .slice(0, MAX_RESULTS)
  }, [searchVal, companies])

  const handleSelect = (id: number) => {
    actor.send({ type: 'OPEN_COMPANY', id })
    setSearchVal('')
    setSearchOpen(false)
  }

  let crumbCur = 'GLOBAL ATLAS'
  if (search.overlay === 'gold') {
    crumbCur = search.id === 7 ? 'ELON MUSK' : `PERSON #${search.id}`
  } else if (search.overlay === 'company' && typeof search.id === 'number') {
    const c = companies.find(c => c.id === search.id)
    crumbCur = (c?.name ?? `COMPANY #${search.id}`).toUpperCase()
  } else if (search.overlay === 'vs') {
    crumbCur = `${search.a} VS ${search.b}`
  }

  return (
    <div className={styles.topbar}>
      <div className={styles.brandMark}>
        <div className={styles.brandDot} />
        <span className={styles.brand}>IPM</span>
      </div>
      <div className={styles.sepV} />
      <span className={styles.crumb}>
        WORKSTATION · <span className={styles.crumbCur}>{crumbCur}</span>
      </span>


      <div className={styles.searchBox}>
        <input
          className={styles.searchInput}
          placeholder="Search companies..."
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
          spellCheck={false}
        />
        {searchOpen && suggestions.length > 0 && (
          <div className={styles.searchDropdown}>
            {suggestions.map(c => (
              <button
                key={c.id}
                type="button"
                className={styles.searchSuggestion}
                onClick={() => handleSelect(c.id)}
              >
                <span className={styles.searchSugName}>{c.name}</span>
                {c.marketCapUsd != null && (
                  <span className={styles.searchSugCap}>
                    ${(c.marketCapUsd / 1e9).toFixed(0)}B
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.topRight}>
        <a href="/about" className={styles.aboutLink}>About Us</a>
        <div className={styles.sepV} />
        <span>AUTOSAVED · 2 MIN</span>
        <div className={styles.userChip}>
          <div className={styles.avatarSm}>R7</div>
          <span className={styles.userName}>RUBEN</span>
          <span className={styles.userBadge}>PRO</span>
        </div>
      </div>
    </div>
  )
}
