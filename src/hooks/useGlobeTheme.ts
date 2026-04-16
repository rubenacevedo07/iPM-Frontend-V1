// In v2 the globe theme context doesn't exist yet — shim for compatibility
export function useGlobeTheme() {
  return { theme: 'dark' as const }
}
