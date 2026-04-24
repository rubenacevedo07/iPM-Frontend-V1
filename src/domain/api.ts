const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getToken(): string | null {
  return localStorage.getItem('ipm_access_token')
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('ipm_access_token')
    window.dispatchEvent(new CustomEvent('auth:expired'))
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

export const apiGet = <T>(path: string) =>
  apiFetch<T>(path, { method: 'GET' })

export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
