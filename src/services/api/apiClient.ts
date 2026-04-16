// ============================================================
// IPM — Authenticated API Client
// Wraps fetch with:
//   - Authorization: Bearer {accessToken} header
//   - Auto-refresh on 401 (single retry)
//   - Redirect to /login on refresh failure
// ============================================================

// Token store (set by AuthContext on login/refresh)
// Module-level ref so apiClient doesn't need React context.

let _accessToken: string | null = null
let _refreshFn: (() => Promise<boolean>) | null = null
const _devAutoLogin = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true'

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function setRefreshFn(fn: (() => Promise<boolean>) | null) {
  _refreshFn = fn
}

// Core fetch wrapper

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const buildHeaders = (token: string | null): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  })

  const init: RequestInit = {
    method,
    headers: buildHeaders(_accessToken),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  let res = await fetch(path, init)

  // Auto-refresh on 401
  if (res.status === 401) {
    if (_devAutoLogin) {
      // In dev mode, don't redirect — let the error propagate naturally
    } else if (_refreshFn) {
      const refreshed = await _refreshFn()
      if (refreshed) {
        res = await fetch(path, {
          ...init,
          headers: buildHeaders(_accessToken),
        })
      } else {
        window.location.href = '/login'
        throw new Error('Session expired. Redirecting to login.')
      }
    }
  }

  if (!res.ok) {
    let message = `API error ${res.status}`
    try {
      const err = await res.json()
      message = err.message ?? err.title ?? message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T

  return res.json()
}

// Public API

export const apiClient = {
  get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(path, { method: 'GET', headers })
  },

  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>(path, { method: 'POST', body, headers })
  },

  put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>(path, { method: 'PUT', body, headers })
  },

  patch<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>(path, { method: 'PATCH', body, headers })
  },

  delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(path, { method: 'DELETE', headers })
  },
}
