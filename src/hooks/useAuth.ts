// In v2, auth is handled by the XState auth machine — this is a compatibility shim
// that re-exports from the auth machine context if available.
export function useAuth() {
  // Placeholder — wire to v2 auth machine when needed
  return { user: null, isAuthenticated: false }
}
