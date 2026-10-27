import { describe, expect, it } from 'vitest'
import { MAX_PUSHES, originAllowed, parsePushes, pushHostOk, validPush } from '../../../relay/guard'
import { timerTargets } from '../relay'
import type { PushTarget } from '../types'

/** The push relay forwards only what the desktop helper would send (ADR-037). Each guard has a case here. */

const good = () => ({
  endpoint: 'https://web.push.apple.com/QHk3x',
  headers: { Authorization: 'vapid t=a.b.c, k=xyz', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '600', Urgency: 'high' },
  body: 'AAECAwQ=',
})

describe('push relay guard', () => {
  it('accepts a push for each known push service', () => {
    for (const host of ['web.push.apple.com', 'fcm.googleapis.com', 'updates.push.services.mozilla.com', 'wns2-db5p.notify.windows.com', 'api.push.apple.com']) {
      expect(validPush({ ...good(), endpoint: `https://${host}/x` })).toBe(true)
    }
  })

  it('refuses any other host, look-alikes included', () => {
    for (const e of ['https://example.com/x', 'https://web.push.apple.com.evil.com/x', 'https://evilnotify.windows.com/x', 'https://127.0.0.1/x', 'https://localhost/x']) {
      expect(pushHostOk(e)).toBe(false)
    }
  })

  it('refuses plain http, another port, and credentials in the address', () => {
    expect(pushHostOk('http://web.push.apple.com/x')).toBe(false)
    expect(pushHostOk('https://web.push.apple.com:8443/x')).toBe(false)
    expect(pushHostOk('https://user:pw@web.push.apple.com/x')).toBe(false)
    expect(pushHostOk('https://web.push.apple.com:443/x')).toBe(true)
  })

  it('refuses headers other than the Web Push ones, and any with a line break', () => {
    expect(validPush({ ...good(), headers: { ...good().headers, Cookie: 'a=b' } })).toBe(false)
    expect(validPush({ ...good(), headers: { ...good().headers, TTL: '600\r\nX-Evil: 1' } })).toBe(false)
    expect(validPush({ ...good(), headers: { ...good().headers, Topic: 'x'.repeat(2000) } })).toBe(false)
  })

  it('refuses a body that is not base64 or is too long', () => {
    expect(validPush({ ...good(), body: 'not base64!' })).toBe(false)
    expect(validPush({ ...good(), body: 'A'.repeat(8004) })).toBe(false)
    expect(validPush({ ...good(), body: 'A'.repeat(8000) })).toBe(true)
  })

  it('takes a request only when every push in it is acceptable, and at most MAX_PUSHES', () => {
    expect(parsePushes({ push: [good(), good()] })).toHaveLength(2)
    expect(parsePushes({ push: [good(), { ...good(), endpoint: 'https://example.com/x' }] })).toBeNull()
    expect(parsePushes({ push: Array.from({ length: MAX_PUSHES + 1 }, good) })).toBeNull()
    expect(parsePushes({ push: [] })).toBeNull()
    expect(parsePushes({})).toBeNull()
    expect(parsePushes(null)).toBeNull()
  })

  it('serves only the configured origins, matched exactly', () => {
    const allowed = 'https://someone.github.io, http://localhost:5181'
    expect(originAllowed('https://someone.github.io', allowed)).toBe(true)
    expect(originAllowed('http://localhost:5181', allowed)).toBe(true)
    expect(originAllowed('https://someone.github.io.evil.com', allowed)).toBe(false)
    expect(originAllowed('https://other.github.io', allowed)).toBe(false)
    expect(originAllowed('null', allowed)).toBe(false)
    expect(originAllowed(null, allowed)).toBe(false)
    expect(originAllowed('https://someone.github.io', '')).toBe(false)
  })
})

describe('which devices hear of a timer ending here', () => {
  const target = (id: string, timer: boolean): PushTarget => ({
    id, label: id, endpoint: 'https://fcm.googleapis.com/x', p256dh: '', auth: '', vapidPublic: '', vapidPrivate: {}, subject: '',
    createdAt: '', updatedAt: '', kinds: { timer, reminders: true, checkIns: true },
  })

  it('every other device that wants timer endings — never this one, which shows its own', () => {
    const ts = [target('me', true), target('phone', true), target('tablet', false)]
    expect(timerTargets(ts, 'me').map((t) => t.id)).toEqual(['phone'])
    expect(timerTargets(ts, null).map((t) => t.id)).toEqual(['me', 'phone'])
  })
})
