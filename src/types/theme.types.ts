export type ThemeName = 'cyberpunk' | 'obsidian' | 'anthropic' | 'minimal'

export interface ThemeContextValue {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  toggleTheme: () => void
}
