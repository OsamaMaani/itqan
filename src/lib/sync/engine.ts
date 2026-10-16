import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { migrate, SCHEMA_VERSION } from '../migrations'
import { emptyData } from '../seed'
import { snapshot, useStore } from '../store'
import { decrypt, deriveKey, encrypt, isEnvelope, randomB64, WrongPassphrase } from './crypto'
import { fromEntities, hasUserData, toEntities, type Entities } from './entities'
import { checkRepo, readSyncFile, SyncError, writeSyncFile, type RepoRef } from './github'
import { initMeta, merge, stamp, type Meta, type Side } from './merge'

/**
 * GitHub sync (ADR-016). One encrypted file, itqan-sync.json, in a private repository holds
 * every device's entities and their change stamps. Each device: pull → merge → apply → push,
 * with optimistic concurrency on the file's sha.
 *
 * Sync state lives in its own localStorage key ("itqan-sync"), outside the Data schema, so the
 * planner's data model is unchanged by sync.
 */

export interface SyncConfig {
  owner: string
  repo: string
  token: string
  keyB64: string
  saltB64: string
  iterations: number
}

type Status = 'off' | 'idle' | 'syncing' | 'offline' | 'error'

interface SyncState {
  config: SyncConfig | null
  deviceId: string
  meta: Meta
  remote: { sha: string | null; etag: string | null } | null
  lastSyncAt: number | null
  status: Status
  error: string | null
}

export const useSync = create<SyncState>()(
  persist(
    (): SyncState => ({
      config: null, deviceId: randomB64(9), meta: {}, remote: null, lastSyncAt: null, status: 'off', error: null,
    }),
    {
      name: 'itqan-sync',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ config: s.config, deviceId: s.deviceId, meta: s.meta, remote: s.remote, lastSyncAt: s.lastSyncAt }),
    },
  ),
)

interface RemoteDoc {
  app: 'itqan-sync-doc'
  schemaVersion: number
  entities: Entities
  meta: Meta
  updatedAt: number
  device: string
}

// --- change tracking -----------------------------------------------------------------

let prev: Entities = {}
let suppress = false
let localVersion = 0
let started = false

function trackerStart() {
  prev = toEntities(snapshot(useStore.getState()))
  const m = initMeta(prev, useSync.getState().meta)
  if (m !== useSync.getState().meta) useSync.setState({ meta: m })
  useStore.subscribe((s) => {
    if (suppress) return
    const next = toEntities(snapshot(s))
    const meta = useSync.getState().meta
    const m2 = stamp(prev, next, meta, Date.now())
    prev = next
    if (m2 !== meta) {
      localVersion++
      useSync.setState({ meta: m2 })
      soon(3000)
    }
  })
}

/** Replace local data with merged entities without recording it as a local change. */
function apply(entities: Entities, meta: Meta) {
  suppress = true
  try {
    const next = fromEntities(entities, snapshot(useStore.getState()))
    useStore.setState(next)
    prev = toEntities(next)
    useSync.setState({ meta })
  } finally {
    suppress = false
  }
}

// --- the sync cycle --------------------------------------------------------------------

let running = false
let again = false
let cachedRemote: Side | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function soon(ms: number) {
  if (!useSync.getState().config) return
  clearTimeout(timer)
  timer = setTimeout(() => { void syncNow() }, ms)
}

const repoOf = (c: SyncConfig): RepoRef => ({ owner: c.owner, repo: c.repo, token: c.token })

async function parseRemote(text: string, c: SyncConfig): Promise<Side> {
  let env: unknown
  try { env = JSON.parse(text) } catch { throw new SyncError('The sync file is damaged (not JSON).') }
  if (!isEnvelope(env)) throw new SyncError('The sync file is not an Itqan sync file.')
  const doc = JSON.parse(await decrypt(env, c.keyB64)) as RemoteDoc
  if (doc.app !== 'itqan-sync-doc' || typeof doc.entities !== 'object' || typeof doc.meta !== 'object') {
    throw new SyncError('The sync file has an unexpected shape.')
  }
  if (doc.schemaVersion > SCHEMA_VERSION) {
    throw new SyncError('Your other device runs a newer Itqan. Update this one first (on the laptop: run install_local.sh).')
  }
  if (doc.schemaVersion < SCHEMA_VERSION) {
    // Bring older data up to this version with the same migrations local data uses.
    const upgraded = migrate(fromEntities(doc.entities, emptyData()), doc.schemaVersion)
    return { entities: toEntities(upgraded), meta: doc.meta }
  }
  return { entities: doc.entities, meta: doc.meta }
}

export async function syncNow(): Promise<void> {
  const c = useSync.getState().config
  if (!c) return
  if (running) { again = true; return }
  running = true
  useSync.setState({ status: 'syncing' })
  try {
    for (let attempt = 0; ; attempt++) {
      if (attempt > 4) throw new SyncError('Could not settle with the other device; will retry shortly.', 'conflict')
      const remote = useSync.getState().remote
      const read = await readSyncFile(repoOf(c), cachedRemote && remote?.etag ? remote.etag : null)

      let remoteSide: Side | null
      let sha: string | null
      let etag: string | null = null
      if (read.status === 'unchanged') { remoteSide = cachedRemote; sha = remote?.sha ?? null; etag = remote?.etag ?? null }
      else if (read.status === 'missing') { remoteSide = null; sha = null }
      else { remoteSide = await parseRemote(read.text, c); sha = read.sha; etag = read.etag }

      const versionAtMerge = localVersion
      const local: Side = { entities: toEntities(snapshot(useStore.getState())), meta: useSync.getState().meta }
      const result = remoteSide ? merge(local, remoteSide) : { ...local, localChanged: false, remoteChanged: true }

      // Something was edited while we were on the network: start over rather than overwrite it.
      if (versionAtMerge !== localVersion) continue

      if (result.localChanged) apply(result.entities, result.meta)
      else useSync.setState({ meta: result.meta })

      if (result.remoteChanged) {
        const doc: RemoteDoc = {
          app: 'itqan-sync-doc', schemaVersion: SCHEMA_VERSION, entities: result.entities, meta: result.meta,
          updatedAt: Date.now(), device: useSync.getState().deviceId,
        }
        const env = await encrypt(JSON.stringify(doc), c.keyB64, c.saltB64, c.iterations)
        try {
          const newSha = await writeSyncFile(repoOf(c), JSON.stringify(env), sha)
          cachedRemote = { entities: result.entities, meta: result.meta }
          useSync.setState({ remote: { sha: newSha, etag: null } })
        } catch (e) {
          if (e instanceof SyncError && e.kind === 'conflict') { cachedRemote = null; continue }
          throw e
        }
      } else {
        cachedRemote = remoteSide
        useSync.setState({ remote: { sha, etag } })
      }
      useSync.setState({ status: 'idle', error: null, lastSyncAt: Date.now() })
      break
    }
  } catch (e) {
    const offline = e instanceof SyncError && e.kind === 'network'
    useSync.setState({ status: offline ? 'offline' : 'error', error: (e as Error).message })
  } finally {
    running = false
    if (again) { again = false; soon(500) }
  }
}

// --- connecting a device ------------------------------------------------------------------

export interface Probe {
  exists: boolean
}

/** Step 1 of connecting: is the repository usable, and is there already a sync file? */
export async function probe(owner: string, repo: string, token: string): Promise<Probe> {
  const r = { owner: owner.trim(), repo: repo.trim(), token: token.trim() }
  await checkRepo(r)
  const read = await readSyncFile(r)
  return { exists: read.status === 'ok' }
}

/**
 * Step 2: derive the key, verify it against the existing file (if any), and start syncing.
 * `replaceLocal` empties this device's synced data first (a new device that should mirror
 * the other one) — without recording deletions, so nothing is deleted anywhere else.
 */
export async function connect(owner: string, repo: string, token: string, passphrase: string, replaceLocal: boolean): Promise<void> {
  const r = { owner: owner.trim(), repo: repo.trim(), token: token.trim() }
  const read = await readSyncFile(r)
  let saltB64: string
  let iterations = 600_000
  let keyB64: string
  if (read.status === 'ok') {
    let env: unknown
    try { env = JSON.parse(read.text) } catch { env = null }
    if (!isEnvelope(env)) throw new SyncError('The repository has an itqan-sync.json that is not an Itqan sync file.')
    saltB64 = env.kdf.salt
    iterations = env.kdf.iterations
    keyB64 = await deriveKey(passphrase, saltB64, iterations)
    await decrypt(env, keyB64) // throws WrongPassphrase
  } else {
    saltB64 = randomB64(16)
    keyB64 = await deriveKey(passphrase, saltB64, iterations)
  }

  const freshDevice = replaceLocal || !hasUserData(toEntities(snapshot(useStore.getState())))
  if (replaceLocal) {
    suppress = true
    try {
      const empty = fromEntities({}, snapshot(useStore.getState()))
      useStore.setState(empty)
      prev = toEntities(empty)
      useSync.setState({ meta: {} })
    } finally {
      suppress = false
    }
  }
  // A device joining with nothing of its own takes the synced settings (name, week start…)
  // rather than its blank defaults.
  if (freshDevice && read.status === 'ok') {
    useSync.setState({ meta: { ...useSync.getState().meta, 'settings:shared': { u: 0 } } })
  }

  cachedRemote = null
  useSync.setState({ config: { ...r, keyB64, saltB64, iterations }, remote: null, status: 'idle', error: null })
  await syncNow()
}

export function disconnect(): void {
  cachedRemote = null
  clearTimeout(timer)
  useSync.setState({ config: null, remote: null, status: 'off', error: null })
}

export { WrongPassphrase }

/** Called once from App: tracks every change, and syncs on start, on edits, every minute and on focus. */
export function startSync(): void {
  if (started) return
  started = true
  trackerStart()
  if (useSync.getState().config) {
    useSync.setState({ status: 'idle' })
    soon(500)
  }
  if (typeof document === 'undefined') return // tests
  setInterval(() => { if (document.visibilityState === 'visible') soon(0) }, 60_000)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') soon(300) })
  window.addEventListener('online', () => soon(300))
}
