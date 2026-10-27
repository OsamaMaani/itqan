/**
 * What the push relay (ADR-037) agrees to forward: the same rules the desktop helper applies before
 * it POSTs a push (scripts/itqan_reminders.py — keep the two in step). A push service, over https
 * on 443, no userinfo; only the Web Push headers, without CR/LF; a base64 body of at most 8000
 * characters. The relay never sees anything readable: the body is already encrypted for the phone.
 *
 * Pure and dependency-free, so the Worker bundles it and the app's tests run it (relay.test.ts).
 */

export const PUSH_HOSTS = ['web.push.apple.com', 'fcm.googleapis.com', 'updates.push.services.mozilla.com']
export const PUSH_HOST_SUFFIXES = ['.notify.windows.com', '.push.apple.com']
export const PUSH_HEADERS = new Set(['Authorization', 'Content-Encoding', 'Content-Type', 'TTL', 'Urgency', 'Topic'])
/** Pushes in one request: one per registered device; the app sends one alert at a time. */
export const MAX_PUSHES = 10
/** The whole request body, in bytes: ten pushes of 8000 characters and their headers fit. */
export const MAX_REQUEST_BYTES = 120_000

export interface RelayPush {
  endpoint: string
  headers: Record<string, string>
  body: string
}

export function pushHostOk(endpoint: string): boolean {
  let u: URL
  try { u = new URL(endpoint) } catch { return false }
  const host = u.hostname.toLowerCase()
  return u.protocol === 'https:' && !u.username && !u.password && (u.port === '' || u.port === '443')
    && (PUSH_HOSTS.includes(host) || PUSH_HOST_SUFFIXES.some((s) => host.endsWith(s)))
}

const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

export function validPush(p: unknown): p is RelayPush {
  if (!p || typeof p !== 'object') return false
  const { endpoint, headers, body } = p as Record<string, unknown>
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return false
  if (typeof body !== 'string' || body.length > 8000 || !BASE64.test(body)) return false
  for (const [k, v] of Object.entries(headers)) {
    if (!PUSH_HEADERS.has(k) || typeof v !== 'string' || v.length >= 2000 || /[\r\n]/.test(v)) return false
  }
  return pushHostOk(endpoint)
}

/** The request's pushes when every one of them is acceptable, else null: all or nothing, like the helper. */
export function parsePushes(json: unknown): RelayPush[] | null {
  if (!json || typeof json !== 'object') return null
  const push = (json as { push?: unknown }).push
  if (!Array.isArray(push) || push.length === 0 || push.length > MAX_PUSHES) return null
  return push.every(validPush) ? push : null
}

/** Is this page allowed to use the relay? An exact match against the configured origins — never a pattern. */
export function originAllowed(origin: string | null, allowed: string): boolean {
  if (!origin) return false
  return allowed.split(',').map((s) => s.trim()).filter(Boolean).includes(origin)
}

export function decodeBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
