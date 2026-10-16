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
    expect(d.tasks).toEqual([{ id: 't1', projectId: null }]) // + v3's project link
    expect(d.habitLogs).toEqual({ h1: { '2026-10-15': 1 } })
    expect(d.settings.name).toBe('Sam')
  })
  it('a v1 backup still restores', () => {
    const b = { app: 'itqan', schemaVersion: 1, exportedAt: '', data: { areas: [], tasks: [{ id: 'x' }], habits: [], goals: [] } }
    expect(parseBackup(JSON.stringify(b)).tasks).toEqual([{ id: 'x', projectId: null }])
  })
})

describe('v2 → v3 (projects, connections)', () => {
  it('links nothing, adds the new collections, and keeps every field of existing records', () => {
    const v2 = {
      tasks: [{ id: 't1', title: 'Read', goalId: 'g1', done: true }],
      reminders: [{ id: 'r1', title: 'Mum', repeat: 'yearly' }],
      memories: [{ id: 'm1' }], ideas: [{ id: 'i1' }],
    }
    const d = migrate(v2, 2)
    expect(d.tasks).toEqual([{ id: 't1', title: 'Read', goalId: 'g1', done: true, projectId: null }])
    expect(d.reminders).toEqual([{ id: 'r1', title: 'Mum', repeat: 'yearly', contactId: null, countYears: true }])
    expect(d.memories).toEqual([{ id: 'm1' }])
    expect(d.projects).toEqual([])
    expect(d.contacts).toEqual([])
    expect(d.interactions).toEqual([])
  })
  it('never overwrites a value that is already there', () => {
    const d = migrate({ tasks: [{ id: 't', projectId: 'p1' }], reminders: [{ id: 'r', contactId: 'c1', countYears: false }] }, 2)
    expect(d.tasks[0].projectId).toBe('p1')
    expect(d.reminders[0]).toMatchObject({ contactId: 'c1', countYears: false })
  })
})
