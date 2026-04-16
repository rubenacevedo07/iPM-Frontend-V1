/**
 * apiConfig.ts — config/apiConfig.ts (v2 shim)
 *
 * In v2, all API calls go through /api (proxied to http://localhost:5000).
 * All constants resolve to '/api' so the legacy services work unchanged.
 */

export const API_COMPANIES      = '/api'
export const API_MARKETS        = '/api'
export const API_PRODUCTS       = '/api'
export const API_FABRICS        = '/api'
export const API_CLIENTS        = '/api'
export const API_PROVIDERS      = '/api'
export const API_COUNTRIES      = '/api'
export const API_TRADES         = '/api'
export const API_COMMODITIES    = '/api'
export const API_ASSET_MANAGERS = '/api'
export const API_POWER_MAPS     = '/api'
export const API_ALPHAVANTAGE   = '/api'
export const API_SECTORS        = '/api'
export const API_GRAPH          = '/api'

export const VITE_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
