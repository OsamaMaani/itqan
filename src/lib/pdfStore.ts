/**
 * PDFs kept on this device (ADR-046). The files are far too big for localStorage (~5 MB) and must
 * not go through sync (a GitHub file), so each device keeps its own copies in IndexedDB, keyed by
 * the SHA-256 of their bytes; only that hash travels with the book. Works from file:// in Chrome
 * (checked 2026-11-11) as well as on the hosted app.
 *
 * Two stores: `pdfs` (hash → the file as a Blob) and `covers` (hash → a small JPEG of the first
 * page, drawn once on this device).
 */

const DB = 'itqan-files'
const VERSION = 1

let opening: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DB, VERSION)
    r.onupgradeneeded = () => {
      const d = r.result
      if (!d.objectStoreNames.contains('pdfs')) d.createObjectStore('pdfs')
      if (!d.objectStoreNames.contains('covers')) d.createObjectStore('covers')
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => { opening = null; reject(r.error) }
    r.onblocked = () => { opening = null; reject(new Error('IndexedDB blocked')) }
  })
  return opening
}

function run<T>(store: 'pdfs' | 'covers', mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then((d) => new Promise<T>((resolve, reject) => {
    const tx = d.transaction(store, mode)
    const req = op(tx.objectStore(store))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error ?? req.error)
    tx.onabort = () => reject(tx.error ?? new Error('aborted'))
  }))
}

/** SHA-256 of the bytes, as hex. */
export async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function savePdf(hash: string, file: Blob): Promise<void> {
  await run('pdfs', 'readwrite', (s) => s.put(file, hash))
}

/**
 * The PDF as a Blob, without reading it: IndexedDB hands back a file-backed Blob, so the reader can
 * read only the slices it needs (ADR-048). null when this device does not have it.
 */
export async function loadPdfBlob(hash: string): Promise<Blob | null> {
  return (await run<Blob | undefined>('pdfs', 'readonly', (s) => s.get(hash) as IDBRequest<Blob | undefined>)) ?? null
}

/** The hashes of every PDF on this device. */
export async function pdfHashes(): Promise<Set<string>> {
  const keys = await run('pdfs', 'readonly', (s) => s.getAllKeys())
  return new Set(keys.map(String))
}

export async function removePdf(hash: string): Promise<void> {
  await run('pdfs', 'readwrite', (s) => s.delete(hash))
  await run('covers', 'readwrite', (s) => s.delete(hash))
}

export async function saveCover(hash: string, jpeg: Blob): Promise<void> {
  await run('covers', 'readwrite', (s) => s.put(jpeg, hash))
}

export async function loadCover(hash: string): Promise<Blob | null> {
  return (await run<Blob | undefined>('covers', 'readonly', (s) => s.get(hash) as IDBRequest<Blob | undefined>)) ?? null
}

/** How much this site stores and may store, in bytes, when the browser says. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.()
    return e && e.usage !== undefined && e.quota !== undefined ? { usage: e.usage, quota: e.quota } : null
  } catch {
    return null
  }
}
