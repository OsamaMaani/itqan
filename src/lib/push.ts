import type { PushTarget } from './types'

/**
 * Web Push without a server (ADR-031). A device that wants alerts subscribes with its own VAPID
 * key pair and records everything in a synced PushTarget. The laptop app then builds each push
 * request here — signed (VAPID, RFC 8292) and encrypted for that device (aes128gcm, RFC 8291) —
 * and hands it to the local helper, which only POSTs it at the alert's time. The helper stays
 * standard-library Python with no cryptography; the push service sees only ciphertext.
 *
 * WebCrypto only, so it runs in the file:// app, on the phone and in tests (Node).
 */

export interface PushRequest {
  endpoint: string
  headers: Record<string, string>
  /** The encrypted body, standard base64. */
  body: string
}

export interface PushMessage {
  title: string
  body: string
  /** Same tag = the newer notification replaces the older one on the device. */
  tag?: string
}

const subtle = () => globalThis.crypto.subtle
const enc = new TextEncoder()

export function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function b64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of parts) { out.set(p, i); i += p.length }
  return out
}

/** A fresh VAPID key pair for one device: the public key as subscribe() wants it, the private one to sign with. */
export async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: JsonWebKey }> {
  const pair = await subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const raw = new Uint8Array(await subtle().exportKey('raw', pair.publicKey))
  return { publicKey: b64url(raw), privateKey: await subtle().exportKey('jwk', pair.privateKey) }
}

/**
 * The VAPID Authorization header value. `expSec` is when the token stops being valid (epoch
 * seconds); push services refuse one more than a day ahead at the time it is sent.
 */
export async function vapidAuthorization(endpoint: string, t: Pick<PushTarget, 'vapidPublic' | 'vapidPrivate' | 'subject'>, expSec: number): Promise<string> {
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(expSec), sub: t.subject })))
  const key = await subtle().importKey('jwk', { ...t.vapidPrivate, key_ops: ['sign'] }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  // WebCrypto's ECDSA signature is r‖s (64 bytes) — exactly the JWS ES256 form.
  const sig = new Uint8Array(await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`)))
  return `vapid t=${header}.${claims}.${b64url(sig)}, k=${t.vapidPublic}`
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, bytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await subtle().importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8))
}

/**
 * RFC 8291 + RFC 8188: one aes128gcm record for the device's keys. `fixed` (salt and sender key)
 * exists only so the RFC's own example can be reproduced in a test; real pushes never pass it.
 */
export async function encryptPayload(plaintext: Uint8Array, p256dh: string, auth: string, fixed?: { salt: Uint8Array<ArrayBuffer>; ephemeral: CryptoKeyPair }): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = unb64url(p256dh)
  const authSecret = unb64url(auth)
  const ephemeral = fixed?.ephemeral ?? await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublic = new Uint8Array(await subtle().exportKey('raw', ephemeral.publicKey))
  const uaKey = await subtle().importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await subtle().deriveBits({ name: 'ECDH', public: uaKey }, ephemeral.privateKey, 256))

  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const salt = fixed?.salt ?? globalThis.crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const aes = await subtle().importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // 0x02 marks the last (and only) record; no extra padding.
  const sealed = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))))

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, sealed)
}

/**
 * A ready-to-send push for one device, valid until `validUntil` (epoch ms). The token is signed
 * to expire shortly after the alert's time, so a push the helper sends late is refused rather
 * than arriving as a stale "your session ended".
 */
export async function buildPushRequest(t: PushTarget, msg: PushMessage, validUntil: number): Promise<PushRequest> {
  const body = await encryptPayload(enc.encode(JSON.stringify(msg)), t.p256dh, t.auth)
  return {
    endpoint: t.endpoint,
    headers: {
      Authorization: await vapidAuthorization(t.endpoint, t, validUntil / 1000),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '600',
      Urgency: 'high',
    },
    body: b64(body),
  }
}
