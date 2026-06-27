import type { Request } from 'express'

export function isPrivateIp(ip: string): boolean {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return true
  if (ip.startsWith('192.168.') || ip.startsWith('10.')) return true
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1] || '0', 10)
    if (second >= 16 && second <= 31) return true
  }
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true
  return false
}

function normalizeIp(raw: string): string {
  return raw.trim().replace(/^::ffff:/, '')
}

/** IP real del visitante detrás de Nginx / Cloudflare / proxies. */
export function getClientIp(req: Request): string {
  const cf = req.headers['cf-connecting-ip']
  if (typeof cf === 'string' && cf) {
    const ip = normalizeIp(cf)
    if (!isPrivateIp(ip)) return ip
  }

  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    const first = normalizeIp(forwarded.split(',')[0] || '')
    if (first && !isPrivateIp(first)) return first
  } else if (Array.isArray(forwarded)) {
    for (const entry of forwarded) {
      const first = normalizeIp(entry.split(',')[0] || '')
      if (first && !isPrivateIp(first)) return first
    }
  }

  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string' && realIp) {
    const ip = normalizeIp(realIp)
    if (!isPrivateIp(ip)) return ip
  }

  return normalizeIp(req.socket.remoteAddress || '')
}
