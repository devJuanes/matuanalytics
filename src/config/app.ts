/** Base URL del API en producción (sin barra final). En dev, vacío = proxy de Vite. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

export function apiPath(path: string): string {
  const base = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}
