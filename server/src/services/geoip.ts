export interface GeoLocation {
  country: string
  countryCode: string
  city: string
  region: string
  lat: number
  lng: number
}

const cache = new Map<string, GeoLocation>()
const LOCAL_GEO: GeoLocation = {
  country: 'Desarrollo local',
  countryCode: 'LO',
  city: 'Localhost',
  region: '',
  lat: 40.4168,
  lng: -3.7038,
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return true
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) return true
  return false
}

export async function resolveGeo(ip: string): Promise<GeoLocation> {
  if (isPrivateIp(ip)) return LOCAL_GEO

  const cached = cache.get(ip)
  if (cached) return cached

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon`,
      { signal: AbortSignal.timeout(4000) },
    )
    const data = await res.json() as {
      status: string
      country?: string
      countryCode?: string
      regionName?: string
      city?: string
      lat?: number
      lon?: number
    }

    if (data.status !== 'success') {
      return { country: 'Desconocido', countryCode: 'XX', city: '', region: '', lat: 0, lng: 0 }
    }

    const geo: GeoLocation = {
      country: data.country || 'Desconocido',
      countryCode: data.countryCode || 'XX',
      city: data.city || '',
      region: data.regionName || '',
      lat: data.lat || 0,
      lng: data.lon || 0,
    }
    cache.set(ip, geo)
    return geo
  } catch {
    return { country: 'Desconocido', countryCode: 'XX', city: '', region: '', lat: 0, lng: 0 }
  }
}
