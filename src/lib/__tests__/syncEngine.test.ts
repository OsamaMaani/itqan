import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { b64, decrypt, deriveKey, encrypt, unb64, WrongPassphrase, type Envelope } from '../sync/crypto'
import { connect, startSync, syncNow, useSync } from '../sync/engine'
import { useStore } from '../store'
import type { Task } from '../types'

/**
 * The real engine against a fake GitHub that behaves like the contents API: private repo,
 * sha-checked writes (409 on a stale sha). "The other device" edits the file directly.
 */

interface FileState { sha: string; text: string }
let file: FileState | null = null
let shaN = 0
let beforeWrite: (() => void) | null = null
let conflicts = 0
const PASS = 'test passphrase'

function fakeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  const method = init.method ?? 'GET'
  if (url.endsWith('/repos/me/itqan-data')) return Promise.resolve(json(200, { private: true, permissions: { push: true } }))
  if (url.endsWith('/contents/itqan-sync.json')) {
    if (method === 'GET') {
      if (!file) return Promise.resolve(json(404, { message: 'Not Found' }))
      return Promise.resolve(json(200, { sha: file.sha, encoding: 'base64', content: b64(new TextEncoder().encode(file.text)) }))
    }
    if (method === 'PUT') {
      beforeWrite?.(); beforeWrite = null
      const body = JSON.parse(String(init.body))
      if ((file?.sha ?? undefined) !== body.sha) { conflicts++; return Promise.resolve(json(409, { message: 'sha mismatch' })) }
      file = { sha: `sha${++shaN}`, text: new TextDecoder().decode(unb64(body.content)) }
      return Promise.resolve(json(200, { content: { sha: file.sha } }))
    }
  }
  return Promise.resolve(json(404, {}))
}

type Doc = { entities: Record<string, unknown>; meta: Record<string, { u: number; d?: 1 }> }

/** The other device prepares its next version of the file from the current one. */
async function prepareOther(change: (doc: Doc) => void): Promise<FileState> {
  const env = JSON.parse(file!.text) as Envelope
  const key = await deriveKey(PASS, env.kdf.salt, env.kdf.iterations)
  const doc = JSON.parse(await decrypt(env, key))
  change(doc)
  const next = await encrypt(JSON.stringify(doc), key, env.kdf.salt, env.kdf.iterations)
  return { sha: `sha${++shaN}`, text: JSON.stringify(next) }
}

/** The other device saves (it read the current version, so GitHub accepts it). */
async function otherDevice(change: (doc: Doc) => void) {
  file = await prepareOther(change)
}

async function remoteDoc() {
  const env = JSON.parse(file!.text) as Envelope
  return JSON.parse(await decrypt(env, await deriveKey(PASS, env.kdf.salt, env.kdf.iterations)))
}

const titles = () => useStore.getState().tasks.map((t) => t.title).sort()

beforeAll(() => { vi.stubGlobal('fetch', fakeFetch); startSync() })
afterAll(() => vi.unstubAllGlobals())

describe('sync engine (fake GitHub)', () => {
  it('first device: uploads existing data, encrypted', async () => {
    useStore.getState().addTask({ title: 'Laptop task', date: null })
    await connect('me', 'itqan-data', 'tok', PASS, false)
    expect(useSync.getState().status).toBe('idle')
    expect(file!.text).not.toContain('Laptop task')
    const doc = await remoteDoc()
    expect(Object.values(doc.entities).some((e) => (e as Task).title === 'Laptop task')).toBe(true)
  }, 20000)

  it('pulls the other device’s new task and its delete', async () => {
    const laptopId = useStore.getState().tasks.find((t) => t.title === 'Laptop task')!.id
    await otherDevice((doc) => {
      doc.entities['tasks:phone1'] = { ...(doc.entities[`tasks:${laptopId}`] as Task), id: 'phone1', title: 'Phone task' }
      doc.meta['tasks:phone1'] = { u: Date.now() + 1000 }
      delete doc.entities[`tasks:${laptopId}`]
      doc.meta[`tasks:${laptopId}`] = { u: Date.now() + 1000, d: 1 }
    })
    await syncNow()
    expect(titles()).toEqual(['Phone task'])
  }, 20000)

  it('pushes a local edit', async () => {
    useStore.getState().addTask({ title: 'Second laptop task', date: null })
    await syncNow()
    const doc = await remoteDoc()
    expect(Object.values(doc.entities).map((e) => (e as Task).title).filter(Boolean).sort()).toEqual(['Phone task', 'Second laptop task'])
  }, 20000)

  it('when both save at the same moment, retries and keeps both edits', async () => {
    const phoneVersion = await prepareOther((doc) => {
      doc.entities['tasks:phone2'] = { id: 'phone2', title: 'Phone, racing', createdAt: new Date().toISOString(), subtasks: [], done: false } as unknown as Task
      doc.meta['tasks:phone2'] = { u: Date.now() }
    })
    useStore.getState().addTask({ title: 'Laptop, racing', date: null })
    // The phone's save lands between this device's read and its write → our write gets a 409.
    beforeWrite = () => { file = phoneVersion }
    await syncNow()
    expect(conflicts).toBe(1) // the 409 really happened and was recovered from
    expect(titles()).toContain('Phone, racing')
    const doc = await remoteDoc()
    const remoteTitles = Object.values(doc.entities).map((e) => (e as Task).title)
    expect(remoteTitles).toContain('Laptop, racing')
    expect(remoteTitles).toContain('Phone, racing')
  }, 30000)

  it('a wrong passphrase is refused and nothing is changed', async () => {
    const config = useSync.getState().config
    const tasks = useStore.getState().tasks
    await expect(connect('me', 'itqan-data', 'tok', 'not the passphrase', true)).rejects.toBeInstanceOf(WrongPassphrase)
    expect(useSync.getState().config).toBe(config) // still connected with the right key
    expect(useStore.getState().tasks).toBe(tasks) // "replace local" did not run
  }, 20000)
})
