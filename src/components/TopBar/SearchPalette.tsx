import { useEffect, useMemo, useState } from 'react'
import { AppActor } from '@/app/app.machine'
import { SEARCH_THEMES } from './searchThemes'
import styles from './SearchPalette.module.scss'

const MAX_SUGGESTIONS = 5

export function SearchPalette() {
  const actor = AppActor.useActorRef()
  const query = AppActor.useSelector((s) => s.context.query)
  const [inputValue, setInputValue] = useState(query)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    setInputValue(query)
  }, [query])

  const normalizedInput = inputValue.trim().toLowerCase()

  const themeSuggestions = useMemo(() => {
    if (!normalizedInput) return SEARCH_THEMES
    return SEARCH_THEMES.filter((theme) =>
      theme.label.toLowerCase().includes(normalizedInput) ||
      theme.subtitle.toLowerCase().includes(normalizedInput) ||
      theme.category.toLowerCase().includes(normalizedInput),
    ).slice(0, MAX_SUGGESTIONS)
  }, [normalizedInput])

  const handleChange = (value: string) => {
    setInputValue(value)
    actor.send({ type: 'SEARCH_QUERY', q: value })
  }

  const handleSelectTheme = (themeLabel: string) => {
    setInputValue(themeLabel)
    actor.send({ type: 'SEARCH_QUERY', q: themeLabel })
    setIsFocused(false)
  }

  const showSuggestions = isFocused || !!normalizedInput

  return (
    <div className={styles.searchWrapper}>
      <div className={styles.searchInputWrap}>
        <input
          className={styles.searchInput}
          value={inputValue}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 120)}
          placeholder="Search themes, entities or signals..."
          spellCheck={false}
        />
        <div className={styles.searchHint}>Wall Street · AI Power Map · Iran-USA War</div>
      </div>

      <div className={styles.chipRow}>
        {SEARCH_THEMES.slice(0, 4).map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={styles.chip}
            style={{ borderColor: theme.accent, color: theme.accent }}
            onClick={() => handleSelectTheme(theme.label)}
          >
            {theme.label}
          </button>
        ))}
      </div>

      {showSuggestions && (
        <div className={styles.suggestionList}>
          {themeSuggestions.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={styles.suggestionItem}
              onClick={() => handleSelectTheme(theme.label)}
            >
              <div className={styles.suggestionLabel}>{theme.label}</div>
              <div className={styles.suggestionSubtitle}>{theme.subtitle}</div>
            </button>
          ))}
          {themeSuggestions.length === 0 && (
            <div className={styles.emptyState}>No matching themes found.</div>
          )}
        </div>
      )}
    </div>
  )
}
