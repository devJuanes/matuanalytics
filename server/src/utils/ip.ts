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

/** IP real del visitante detrás de Nginx / Cloudflare. */
export function getClientIp(req: Request): string {
  const candidates: string[] = []

  const cf = req.headers['cf-connecting-ip']
  if (typeof cf === 'string' && cf) candidates.push(cf.trim())

  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string' && realIp) candidates.push(realIp.trim())

  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    candidates.push(...forwarded.split(',').map((s) => s.trim()))
  } else if (Array.isArray(forwarded)) {
    for (const entry of forwarded) {
      candidates.push(...entry.split(',').map((s) => s.trim()))
    }
  }

  for (const raw of candidates) {
    const ip = raw.replace('::ffff:', '')
    if (ip && !isPrivateIp(ip)) return ip
  }

  const direct = (req.socket.remoteAddress || '').replace('::ffff:', '')
  return direct
}
