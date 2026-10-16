import { describe, expect, it } from 'vitest'
import { parseBackup, toBackup } from '../backup'
import { migrate, SCHEMA_VERSION } from '../migrations'
import { emptyData, starterData } from '../seed'

describe('migrations never lose data', () => {
  it('fills missing collections without touching existing ones', () => {
    const d = migrate({ tasks: [{ id: 'x' }] }, SCHEMA_VERSION)
    expect(d.tasks).toEqual([{ id: 'x' }])
    expect(d.habits).toEqual([])
    expect(d.settings.weekStartsOn).toBe(6)
  })
  it('keeps saved settings and adds new defaults', () => {
    const d = migrate({ settings: { name: 'Sam' } }, SCHEMA_VERSION)
    expect(d.settings.name).toBe('Sam')
    expect(d.settings.focusMinutes).toBe(25)
  })
})

describe('backups', () => {
  it('round-trips exactly', () => {
    const data = { ...emptyData(), ...starterData('2026-10-16') }
    const back = parseBackup(JSON.stringify(toBackup(data)))
    expect(back).toEqual(data)
  })
  it('rejects files that are not Itqan backups', () => {
    expect(() => parseBackup('{}')).toThrow(/not an Itqan backup/)
    expect(() => parseBackup('nope')).toThrow(/not valid JSON/)
  })
  it('refuses backups from a newer schema rather than guessing', () => {
    const b = toBackup(emptyData())
    b.schemaVersion = SCHEMA_VERSION + 1
    expect(() => parseBackup(JSON.stringify(b))).toThrow(/newer version/)
  })
})

describe('v1 → v2 (memories, ideas, reminders)', () => {
  it('adds the new collections and keeps every existing record', () => {
    const v1 = { tasks: [{ id: 't1' }], habits: [{ id: 'h1' }], habitLogs: { h1: { '2026-10-15': 1 } }, settings: { name: 'Sam', onboarded: true } }
    const d = migrate(v1, 1)
    expect(d.memories).toEqual([])
    expect(d.ideas).toEqual([])
    expect(d.reminders).toEqual([])
    expect(d.tasks).toEqual([{ id: 't1' }])
    expect(d.habitLogs).toEqual({ h1: { '2026-10-15': 1 } })
    expect(d.settings.name).toBe('Sam')
  })
  it('a v1 backup still restores', () => {
    const b = { app: 'itqan', schemaVersion: 1, exportedAt: '', data: { areas: [], tasks: [{ id: 'x' }], habits: [], goals: [] } }
    expect(parseBackup(JSON.stringify(b)).tasks).toEqual([{ id: 'x' }])
  })
})
