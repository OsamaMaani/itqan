/**
 * End-to-end encryption for the sync file (ADR-016): AES-256-GCM with a key derived from the
 * passphrase by PBKDF2-SHA-256 (600,000 iterations, random 16-byte salt). GitHub only ever
 * stores ciphertext. A fresh random IV for every write.
 */

export const ITERATIONS = 600_000

export interface Envelope {
  app: 'itqan-sync'
  v: 1
  kdf: { alg: 'PBKDF2-SHA256'; iterations: number; salt: string }
  iv: string
  data: string
}

export function b64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/\s+/g, ''))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function randomB64(n: number): string {
  return b64(crypto.getRandomValues(new Uint8Array(n)))
}

/** Derives the raw AES key (base64). Slow on purpose; do it once per device and keep the result. */
export async function deriveKey(passphrase: string, saltB64: string, iterations = ITERATIONS): Promise<string> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.normalize('NFC')), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations }, base, 256)
  return b64(new Uint8Array(bits))
}

async function aesKey(keyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', unb64(keyB64), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encrypt(plaintext: string, keyB64: string, saltB64: string, iterations = ITERATIONS): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(keyB64), new TextEncoder().encode(plaintext))
  return { app: 'itqan-sync', v: 1, kdf: { alg: 'PBKDF2-SHA256', iterations, salt: saltB64 }, iv: b64(iv), data: b64(new Uint8Array(ct)) }
}

export class WrongPassphrase extends Error {
  constructor() { super('Wrong passphrase — it does not match the one used on your other device.') }
}

export async function decrypt(env: Envelope, keyB64: string): Promise<string> {
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, await aesKey(keyB64), unb64(env.data))
    return new TextDecoder().decode(pt)
  } catch {
    throw new WrongPassphrase()
  }
}

export function isEnvelope(x: unknown): x is Envelope {
  const e = x as Envelope
  return !!e && e.app === 'itqan-sync' && e.v === 1 && typeof e.iv === 'string' && typeof e.data === 'string'
    && !!e.kdf && typeof e.kdf.salt === 'string' && typeof e.kdf.iterations === 'number'
}
