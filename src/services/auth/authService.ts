// ============================================================
// IPM — Auth Service
// ============================================================

export type UserRole =
  | 'Free' | 'Explorer' | 'Analyst' | 'Pro'
  | 'Enterprise' | 'Moderator' | 'Admin'

export interface IUser {
  id: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
}

export interface IAuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: IUser
}

export interface ILoginRequest {
  email: string
  password: string
}

export interface IRegisterRequest {
  username: string
  email: string
  password: string
}

export interface IFeatureGate {
  feature: string
  minRoleRank: number
  isEnabled: boolean
}

const BASE = '/api/auth'

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let message = `Auth error ${res.status}`
    try {
      const err = await res.json()
      message = err.message ?? err.title ?? message
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return res.json()
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Auth error ${res.status}`)
  return res.json()
}

export const authService = {
  register(req: IRegisterRequest): Promise<IAuthResponse> { return post('/register', req) },
  login(req: ILoginRequest): Promise<IAuthResponse> { return post('/login', req) },
  refresh(refreshToken: string): Promise<IAuthResponse> { return post('/refresh', { refreshToken }) },
  logout(refreshToken: string): Promise<void> { return post('/logout', { refreshToken }) },
  me(accessToken: string): Promise<IUser> { return get('/me', accessToken) },
  features(accessToken: string): Promise<IFeatureGate[]> { return get('/features', accessToken) },
}
