// In v2, theme context may differ — this is a compatibility shim
// Replace with real context when ThemeContext is added to v2
import type { ThemeContextValue } from '@/types/theme.types'

// Minimal stub so legacy hooks compile
export function useTheme(): ThemeContextValue {
  return { theme: 'dark', setTheme: () => undefined } as unknown as ThemeContextValue
}
