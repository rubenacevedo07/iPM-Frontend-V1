import { useEffect } from 'react'

const BODY_CLASS = 'standalone-page'

/**
 * Hides the global Navbar and Footer for full-bleed pages.
 * Adds a body class on mount and removes it on unmount.
 */
export function useStandalonePage() {
  useEffect(() => {
    document.body.classList.add(BODY_CLASS)
    return () => {
      document.body.classList.remove(BODY_CLASS)
    }
  }, [])
}
