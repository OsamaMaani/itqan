import { describe, expect, it } from 'vitest'
import { decrypt, deriveKey, encrypt, randomB64, WrongPassphrase } from '../sync/crypto'
import { upgradeEntities } from '../sync/engine'
import { fromEntities, hasUserData, toEntities } from '../sync/entities'
import { initMeta, merge, stamp, type Meta } from '../sync/merge'
import { emptyData, starterData } from '../seed'
import type { Data, Task } from '../types'

const data = (): Data => ({ ...emptyData(), ...starterData('2026-10-16'), habitLogs: { h1: { '2026-10-15': 1 } }, dayNotes: { '2026-10-16': { intention: 'focus', mood: 4, reflection: '' } } })
const task = (id: string, title = id): Task => ({
  id, title, notes: '', areaId: null, goalId: null, projectId: null, date: null, timeOfDay: 'anytime', priority: 0, estimateMin: null,
  subtasks: [], done: false, doneAt: null, createdAt: `2026-10-16T0${id.length}:00:00Z`, order: 0,
})

describe('entities', () => {
  it('round-trips all synced data exactly', () => {
    const d = data()
    expect(fromEntities(toEntities(d), d)).toEqual(d)
  })
  it('keeps device-local state: timer, theme, onboarding', () => {
    const remote = { ...data(), settings: { ...data().settings, theme: 'light' as const, name: 'Sam', onboarded: true } }
    const local = { ...emptyData(), settings: { ...emptyData().settings, theme: 'dark' as const } }
    const out = fromEntities(toEntities(remote), local)
    expect(out.settings.theme).toBe('dark')
    expect(out.settings.onboarded).toBe(false)
    expect(out.settings.name).toBe('Sam') // shared settings do follow
    expect(out.tasks.length).toBe(remote.tasks.length)
  })
  it('an empty device has no user data', () => {
    expect(hasUserData(toEntities(emptyData()))).toBe(false)
    expect(hasUserData(toEntities(data()))).toBe(true)
  })
})

describe('change tracking', () => {
  it('stamps added and changed items, and tombstones removed ones', () => {
    const a = task('a'), b = task('b')
    const prev = { 'tasks:a': a, 'tasks:b': b }
    const next = { 'tasks:a': { ...a, title: 'edited' }, 'tasks:c': task('c') }
    const m = stamp(prev, next, {}, 500)
    expect(m).toEqual({ 'tasks:a': { u: 500 }, 'tasks:c': { u: 500 }, 'tasks:b': { u: 500, d: 1 } })
  })
  it('does not stamp untouched items', () => {
    const a = task('a')
    expect(stamp({ 'tasks:a': a }, { 'tasks:a': a }, {}, 500)).toEqual({})
  })
  it('existing data without stamps counts as ancient', () => {
    expect(initMeta({ 'tasks:a': task('a') }, {})).toEqual({ 'tasks:a': { u: 1 } })
  })
})

describe('merge — nothing a person did is lost', () => {
  const side = (entities: Record<string, unknown>, meta: Meta) => ({ entities, meta })

  it('edits to different items on two devices both survive', () => {
    const r = merge(
      side({ 'tasks:a': task('a', 'laptop edit'), 'tasks:b': task('b') }, { 'tasks:a': { u: 20 }, 'tasks:b': { u: 1 } }),
      side({ 'tasks:a': task('a'), 'tasks:b': task('b', 'phone edit') }, { 'tasks:a': { u: 1 }, 'tasks:b': { u: 30 } }),
    )
    expect((r.entities['tasks:a'] as Task).title).toBe('laptop edit')
    expect((r.entities['tasks:b'] as Task).title).toBe('phone edit')
    expect(r.localChanged).toBe(true)
    expect(r.remoteChanged).toBe(true)
  })
  it('the newer edit of the same item wins', () => {
    const r = merge(side({ 'tasks:a': task('a', 'old') }, { 'tasks:a': { u: 10 } }), side({ 'tasks:a': task('a', 'new') }, { 'tasks:a': { u: 11 } }))
    expect((r.entities['tasks:a'] as Task).title).toBe('new')
  })
  it('a newer delete beats an older edit', () => {
    const r = merge(side({}, { 'tasks:a': { u: 50, d: 1 } }), side({ 'tasks:a': task('a', 'edited earlier') }, { 'tasks:a': { u: 40 } }))
    expect(r.entities['tasks:a']).toBeUndefined()
    expect(r.meta['tasks:a']).toEqual({ u: 50, d: 1 })
    expect(r.remoteChanged).toBe(true)
  })
  it('a newer edit beats an older delete', () => {
    const r = merge(side({}, { 'tasks:a': { u: 40, d: 1 } }), side({ 'tasks:a': task('a', 'kept') }, { 'tasks:a': { u: 50 } }))
    expect((r.entities['tasks:a'] as Task).title).toBe('kept')
    expect(r.localChanged).toBe(true)
  })
  it('a new device pulls everything without uploading', () => {
    const remote = side({ 'tasks:a': task('a') }, { 'tasks:a': { u: 5 } })
    const r = merge(side({}, {}), remote)
    expect(r.entities).toEqual(remote.entities)
    expect(r.localChanged).toBe(true)
    expect(r.remoteChanged).toBe(false)
  })
  it('a stamp of 0 (fresh device settings) always yields to the synced value', () => {
    const r = merge(side({ 'settings:shared': '{"name":"zzz"}' }, { 'settings:shared': { u: 0 } }), side({ 'settings:shared': '{"name":"Sam"}' }, { 'settings:shared': { u: 1 } }))
    expect(r.entities['settings:shared']).toBe('{"name":"Sam"}')
  })
  it('identical sides change nothing', () => {
    const s = side({ 'tasks:a': task('a') }, { 'tasks:a': { u: 5 } })
    const r = merge(s, JSON.parse(JSON.stringify(s)))
    expect(r.localChanged).toBe(false)
    expect(r.remoteChanged).toBe(false)
  })
  it('converges: merging in either direction gives the same result', () => {
    const l = side({ 'tasks:a': task('a', 'L'), 'tasks:b': task('b') }, { 'tasks:a': { u: 7 }, 'tasks:b': { u: 3 } })
    const r = side({ 'tasks:a': task('a', 'R'), 'tasks:c': task('c') }, { 'tasks:a': { u: 7 }, 'tasks:b': { u: 4, d: 1 }, 'tasks:c': { u: 2 } })
    const x = merge(l, r), y = merge(r, l)
    expect(x.entities).toEqual(y.entities)
    expect(x.meta).toEqual(y.meta)
  })
})

describe('encryption', () => {
  it('round-trips, and a wrong passphrase cannot read it', async () => {
    const salt = randomB64(16)
    const key = await deriveKey('correct horse battery', salt, 1000)
    const env = await encrypt('{"secret":"memories"}', key, salt, 1000)
    expect(env.data).not.toContain('memories')
    expect(await decrypt(env, key)).toBe('{"secret":"memories"}')
    const wrong = await deriveKey('wrong passphrase', salt, 1000)
    await expect(decrypt(env, wrong)).rejects.toBeInstanceOf(WrongPassphrase)
  })
  it('uses a fresh IV for every write', async () => {
    const salt = randomB64(16)
    const key = await deriveKey('p', salt, 1000)
    const [a, b] = await Promise.all([encrypt('same', key, salt, 1000), encrypt('same', key, salt, 1000)])
    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
  })
  it('detects tampering', async () => {
    const salt = randomB64(16)
    const key = await deriveKey('p', salt, 1000)
    const env = await encrypt('hello world', key, salt, 1000)
    const bytes = atob(env.data)
    const flipped = btoa(String.fromCharCode(bytes.charCodeAt(0) ^ 1) + bytes.slice(1))
    await expect(decrypt({ ...env, data: flipped }, key)).rejects.toBeInstanceOf(WrongPassphrase)
  })
})

describe('sync file from an older Itqan', () => {
  it('a version-2 file is upgraded on read: tasks gain projectId, reminders gain contactId', () => {
    const v2 = {
      'tasks:t1': { id: 't1', title: 'From the phone', createdAt: '2026-10-16T08:00:00Z' },
      'reminders:r1': { id: 'r1', title: 'Mum', repeat: 'yearly', createdAt: '2026-10-16T08:00:00Z' },
      'habitLogs:h1|2026-10-15': 1,
      'settings:shared': '{"name":"Sam"}',
    }
    const up = upgradeEntities(v2, 2)
    expect(up['tasks:t1']).toMatchObject({ title: 'From the phone', projectId: null })
    expect(up['reminders:r1']).toMatchObject({ title: 'Mum', contactId: null, countYears: true })
    expect(up['habitLogs:h1|2026-10-15']).toBe(1)
    expect(JSON.parse(up['settings:shared'] as string).name).toBe('Sam')
    expect(Object.keys(up).sort()).toEqual(Object.keys(v2).sort()) // nothing added, nothing lost
  })
})
