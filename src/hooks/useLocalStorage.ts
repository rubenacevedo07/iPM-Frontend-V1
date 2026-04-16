import { useState, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      try {
        localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch {
        // Storage full or unavailable
      }
    },
    [key, storedValue],
  )

  const removeValue = useCallback(() => {
    setStoredValue(initialValue)
    localStorage.removeItem(key)
  }, [key, initialValue])

  return [storedValue, setValue, removeValue] as const
}
