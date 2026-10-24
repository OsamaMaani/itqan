import { describe, expect, it } from 'vitest'
import { b64url, buildPushRequest, encryptPayload, generateVapidKeys, unb64url, vapidAuthorization } from '../push'
import type { PushTarget } from '../types'

const subtle = globalThis.crypto.subtle
const enc = new TextEncoder()

/** The receiving browser's side of RFC 8291, written out independently, so a wrong key schedule fails. */
async function decrypt(body: Uint8Array<ArrayBuffer>, ua: CryptoKeyPair, auth: Uint8Array<ArrayBuffer>): Promise<string> {
  const salt = body.slice(0, 16)
  const rs = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0)
  const idlen = body[20]
  const asPublic = body.slice(21, 21 + idlen)
  const ct = body.slice(21 + idlen)
  expect(rs).toBe(4096)
  expect(idlen).toBe(65)

  const uaPublic = new Uint8Array(await subtle.exportKey('raw', ua.publicKey))
  const asKey = await subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256))
  const h = async (s: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, n: number) =>
    new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8))
  const info = new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic])
  const ikm = await h(auth, ecdh, info, 32)
  const cek = await h(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await h(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const plain = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), ct))
  expect(plain.at(-1)).toBe(2) // last-record delimiter
  return new TextDecoder().decode(plain.slice(0, -1))
}

async function device() {
  const ua = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const auth = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const vapid = await generateVapidKeys()
  const target: PushTarget = {
    id: 'p', label: 'iPhone', endpoint: 'https://web.push.apple.com/QGx1abc', subject: 'https://example.github.io/itqan/',
    p256dh: b64url(new Uint8Array(await subtle.exportKey('raw', ua.publicKey))), auth: b64url(auth),
    vapidPublic: vapid.publicKey, vapidPrivate: vapid.privateKey, kinds: { timer: true, reminders: true, checkIns: true }, createdAt: '', updatedAt: '',
  }
  return { ua, auth, target }
}

describe('Web Push encryption (RFC 8291)', () => {
  it('reproduces the RFC 8291 example byte for byte', async () => {
    const pub = unb64url('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8')
    const jwk = { kty: 'EC', crv: 'P-256', x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33)), d: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw' }
    const ephemeral = {
      privateKey: await subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']),
      publicKey: await subtle.importKey('raw', pub, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
    }
    const body = await encryptPayload(
      unb64url('V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24'),
      'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
      'BTBZMqHH6r4Tts7J_aSIgg',
      { salt: unb64url('DGv6ra1nlYgDCS1FRnbzlw'), ephemeral },
    )
    expect(b64url(body)).toBe(
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT' +
      'pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    )
  })
  it('the device can decrypt what was sent to it', async () => {
    const { ua, auth, target } = await device()
    const body = await encryptPayload(enc.encode('Focus done — 25 min'), target.p256dh, target.auth)
    expect(await decrypt(body, ua, auth)).toBe('Focus done — 25 min')
  })
  it('another device cannot', async () => {
    const a = await device()
    const b = await device()
    const body = await encryptPayload(enc.encode('secret'), a.target.p256dh, a.target.auth)
    await expect(decrypt(body, b.ua, b.auth)).rejects.toThrow()
  })
  it('every push is encrypted afresh (new salt and key)', async () => {
    const { target } = await device()
    const x = await encryptPayload(enc.encode('same'), target.p256dh, target.auth)
    const y = await encryptPayload(enc.encode('same'), target.p256dh, target.auth)
    expect(b64url(x)).not.toBe(b64url(y))
  })
})

describe('VAPID (RFC 8292)', () => {
  it('signs a token for the push service origin, with the expiry and contact, that verifies with the device key', async () => {
    const { target } = await device()
    const header = await vapidAuthorization(target.endpoint, target, 1_800_000_000.7)
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header)!
    expect(m).not.toBeNull()
    expect(m[4]).toBe(target.vapidPublic)
    const claims = JSON.parse(new TextDecoder().decode(unb64url(m[2])))
    expect(claims).toEqual({ aud: 'https://web.push.apple.com', exp: 1_800_000_000, sub: 'https://example.github.io/itqan/' })
    expect(JSON.parse(new TextDecoder().decode(unb64url(m[1])))).toEqual({ typ: 'JWT', alg: 'ES256' })
    const pub = await subtle.importKey('raw', unb64url(target.vapidPublic), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, unb64url(m[3]), enc.encode(`${m[1]}.${m[2]}`))
    expect(ok).toBe(true)
  })
})

describe('a ready-to-send push', () => {
  it('carries the encrypted message and the headers push services require', async () => {
    const { ua, auth, target } = await device()
    const req = await buildPushRequest(target, { title: '🎯 Focus', body: 'Done', tag: 'timer' }, 1_800_000_000_000)
    expect(req.endpoint).toBe(target.endpoint)
    expect(req.headers['Content-Encoding']).toBe('aes128gcm')
    expect(Number(req.headers.TTL)).toBeGreaterThan(0)
    expect(req.headers.Authorization).toMatch(/^vapid t=.+, k=/)
    const bin = atob(req.body)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    expect(JSON.parse(await decrypt(bytes, ua, auth))).toEqual({ title: '🎯 Focus', body: 'Done', tag: 'timer' })
  })
})
