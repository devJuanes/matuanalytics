import { isPrivateIp } from '../utils/ip.js'

export interface GeoLocation {
  country: string
  countryCode: string
  city: string
  region: string
  lat: number
  lng: number
}

const cache = new Map<string, GeoLocation>()
const CACHE_TTL_MS = 3600_000
const cacheTimestamps = new Map<string, number>()

const LOCAL_GEO: GeoLocation = {
  country: 'Desarrollo local',
  countryCode: 'LO',
  city: 'Localhost',
  region: '',
  lat: 0,
  lng: 0,
}

const UNKNOWN_GEO: GeoLocation = {
  country: 'Desconocido',
  countryCode: 'XX',
  city: '',
  region: '',
  lat: 0,
  lng: 0,
}

async function fetchJson<T>(url: string, timeoutMs = 4000): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function resolveViaIpApiCo(ip: string): Promise<GeoLocation | null> {
  const data = await fetchJson<{
    error?: boolean | string
    country_name?: string
    country_code?: string
    city?: string
    region?: string
    latitude?: number
    longitude?: number
  }>(`https://ipapi.co/${encodeURIComponent(ip)}/json/`)

  if (!data || data.error) return null

  return {
    country: data.country_name || 'Desconocido',
    countryCode: data.country_code || 'XX',
    city: data.city || '',
    region: data.region || '',
    lat: data.latitude || 0,
    lng: data.longitude || 0,
  }
}

async function resolveViaIpApi(ip: string): Promise<GeoLocation | null> {
  const data = await fetchJson<{
    status: string
    country?: string
    countryCode?: string
    regionName?: string
    city?: string
    lat?: number
    lon?: number
  }>(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon`,
  )

  if (!data || data.status !== 'success') return null

  return {
    country: data.country || 'Desconocido',
    countryCode: data.countryCode || 'XX',
    city: data.city || '',
    region: data.regionName || '',
    lat: data.lat || 0,
    lng: data.lon || 0,
  }
}

async function resolveViaIpWho(ip: string): Promise<GeoLocation | null> {
  const data = await fetchJson<{
    success?: boolean
    country?: string
    country_code?: string
    region?: string
    city?: string
    latitude?: number
    longitude?: number
  }>(`https://ipwho.is/${encodeURIComponent(ip)}`)

  if (!data?.success) return null

  return {
    country: data.country || 'Desconocido',
    countryCode: data.country_code || 'XX',
    city: data.city || '',
    region: data.region || '',
    lat: data.latitude || 0,
    lng: data.longitude || 0,
  }
}

export async function resolveGeo(ip: string): Promise<GeoLocation> {
  if (isPrivateIp(ip)) return LOCAL_GEO

  const cachedAt = cacheTimestamps.get(ip)
  if (cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) {
    const cached = cache.get(ip)
    if (cached) return cached
  }

  const providers = [resolveViaIpWho, resolveViaIpApiCo, resolveViaIpApi]
  for (const provider of providers) {
    const geo = await provider(ip)
    if (geo && geo.countryCode !== 'XX') {
      cache.set(ip, geo)
      cacheTimestamps.set(ip, Date.now())
      return geo
    }
  }

  return UNKNOWN_GEO
}
