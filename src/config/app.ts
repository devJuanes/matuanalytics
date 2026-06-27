/** Base URL del API en producción (sin barra final). En dev, vacío = proxy de Vite. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

/** URL pública del tracker (sitios de clientes cargan tracker.js desde aquí). */
export const TRACKER_URL =
  (import.meta.env.VITE_TRACKER_URL as string | undefined)?.replace(/\/$/, '') ||
  API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')

export function apiPath(path: string): string {
  const base = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}
