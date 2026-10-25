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
    expect(d.tasks).toEqual([{ id: 't1', projectId: null, stage: 'todo', blocked: false }]) // + v3/v4 fields
    expect(d.habitLogs).toEqual({ h1: { '2026-10-15': 1 } })
    expect(d.settings.name).toBe('Sam')
  })
  it('a v1 backup still restores', () => {
    const b = { app: 'itqan', schemaVersion: 1, exportedAt: '', data: { areas: [], tasks: [{ id: 'x' }], habits: [], goals: [] } }
    expect(parseBackup(JSON.stringify(b)).tasks).toEqual([{ id: 'x', projectId: null, stage: 'todo', blocked: false }])
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
    expect(d.tasks).toEqual([{ id: 't1', title: 'Read', goalId: 'g1', done: true, projectId: null, stage: 'todo', blocked: false }])
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

describe('v3 → v4 (project boards, manual progress, updates)', () => {
  it('tasks start "to do", projects keep task-based progress, nothing else changes', () => {
    const v3 = {
      tasks: [{ id: 't1', title: 'Domain', projectId: 'p1', done: false }],
      projects: [{ id: 'p1', title: 'Portfolio', status: 'active', links: [] }],
      contacts: [{ id: 'c1' }],
    }
    const d = migrate(v3, 3)
    expect(d.tasks).toEqual([{ id: 't1', title: 'Domain', projectId: 'p1', done: false, stage: 'todo', blocked: false }])
    expect(d.projects).toEqual([{ id: 'p1', title: 'Portfolio', status: 'active', links: [], progressMode: 'tasks', manualProgress: 0, view: 'list', pinned: false }])
    expect(d.projectUpdates).toEqual([])
    expect(d.contacts).toEqual([{ id: 'c1' }])
  })
  it('keeps values that are already set', () => {
    const d = migrate({ tasks: [{ id: 't', stage: 'doing', blocked: true }], projects: [{ id: 'p', progressMode: 'manual', manualProgress: 60 }] }, 3)
    expect(d.tasks[0]).toMatchObject({ stage: 'doing', blocked: true })
    expect(d.projects[0]).toMatchObject({ progressMode: 'manual', manualProgress: 60 })
  })
})

describe('v4 → v5 (achievements)', () => {
  it('adds an empty achievements list and changes nothing else', () => {
    const v4 = { tasks: [{ id: 't', stage: 'doing', blocked: false, projectId: null }], projects: [{ id: 'p', progressMode: 'manual', manualProgress: 40, view: 'board', pinned: true }] }
    const d = migrate(v4, 4)
    expect(d.achievements).toEqual([])
    expect(d.tasks).toEqual(v4.tasks)
    expect(d.projects).toEqual(v4.projects)
  })
})

describe('v5 → v6 (daily card settings)', () => {
  it('turns everything on with French B1, and keeps every saved setting and record', () => {
    const v5 = {
      tasks: [{ id: 't', stage: 'doing', blocked: false, projectId: null }],
      achievements: [{ id: 'a1', title: 'Shipped' }],
      settings: { name: 'Sam', weekStartsOn: 1, showHijri: false, onboarded: true, lastBackupAt: '2026-10-01T00:00:00Z' },
    }
    const d = migrate(v5, 5)
    expect(d.settings.daily).toEqual({ verse: true, hadith: true, word: true, wisdom: true, fact: true, meaning: true, wordLanguage: 'fr', wordLevel: 'B1' })
    expect(d.settings).toMatchObject(v5.settings)
    expect(d.tasks).toEqual(v5.tasks)
    expect(d.achievements).toEqual(v5.achievements)
  })
  it('keeps daily choices already made, filling only what is missing', () => {
    const d = migrate({ settings: { daily: { hadith: false, wordLanguage: 'zh' } } }, 5)
    expect(d.settings.daily).toMatchObject({ hadith: false, wordLanguage: 'zh', verse: true, wordLevel: 'B1' })
  })
  it('a partial daily object at the current version still gets its defaults', () => {
    const d = migrate({ settings: { daily: { word: false } } }, SCHEMA_VERSION)
    expect(d.settings.daily).toMatchObject({ word: false, verse: true, wordLanguage: 'fr' })
  })
  it('a v5 backup restores with the daily settings added', () => {
    const b = { app: 'itqan', schemaVersion: 5, exportedAt: '', data: { areas: [], tasks: [{ id: 'x' }], habits: [], goals: [], settings: { name: 'Sam' } } }
    const d = parseBackup(JSON.stringify(b))
    expect(d.tasks).toEqual([{ id: 'x' }])
    expect(d.settings.name).toBe('Sam')
    expect(d.settings.daily.wordLevel).toBe('B1')
  })
})

describe('v6 → v7 (interface language)', () => {
  it('keeps English for existing data and changes nothing else', () => {
    const v6 = {
      tasks: [{ id: 't', title: 'Read', stage: 'todo', blocked: false, projectId: null }],
      settings: { name: 'Sam', onboarded: true, daily: { verse: false, hadith: true, word: true, wisdom: true, fact: true, meaning: false, wordLanguage: 'es', wordLevel: 'B2' } },
    }
    const d = migrate(v6, 6)
    expect(d.settings.language).toBe('en')
    expect(d.settings.daily).toEqual(v6.settings.daily)
    expect(d.settings.name).toBe('Sam')
    expect(d.tasks).toEqual(v6.tasks)
  })
  it('keeps a language already chosen, and falls back to English for anything unknown', () => {
    expect(migrate({ settings: { language: 'ar' } }, 6).settings.language).toBe('ar')
    expect(migrate({ settings: { language: 'xx' } }, SCHEMA_VERSION).settings.language).toBe('en')
  })
  it('a v6 backup restores in English', () => {
    const b = { app: 'itqan', schemaVersion: 6, exportedAt: '', data: { areas: [], tasks: [], habits: [], goals: [], settings: { name: 'Sam' } } }
    expect(parseBackup(JSON.stringify(b)).settings.language).toBe('en')
  })
})

describe('v7 → v8 (training)', () => {
  const v7 = () => ({
    tasks: [{ id: 't', title: 'Read', stage: 'todo', blocked: false, projectId: null }],
    habits: [{ id: 'h1', name: 'Exercise' }],
    habitLogs: { h1: { '2026-10-19': 1 } },
    goals: [{ id: 'g1', title: 'Read 12 books', kind: 'numeric', startValue: 2, target: 12 }],
    goalLogs: [{ id: 'l1', goalId: 'g1', date: '2026-10-19', amount: 1 }],
    settings: { name: 'Sam', onboarded: true, language: 'ar' },
  })
  it('adds empty training data, an unset program and kg — and keeps every existing record', () => {
    const before = v7()
    const d = migrate(before, 7)
    expect(d.exercises).toEqual([])
    expect(d.routines).toEqual([])
    expect(d.workouts).toEqual([])
    expect(d.workoutSets).toEqual([])
    expect(d.program).toBeNull()
    expect(d.settings.weightUnit).toBe('kg')
    expect(d.settings).toMatchObject({ name: 'Sam', onboarded: true, language: 'ar' })
    expect(d.goals).toEqual([{ ...before.goals[0], link: null }])
    expect(d.goalLogs).toEqual(before.goalLogs)
    expect(d.tasks).toEqual(before.tasks)
    expect(d.habits).toEqual(before.habits)
    expect(d.habitLogs).toEqual(before.habitLogs)
  })
  it('never overwrites training data or choices already there', () => {
    const program = { mode: 'rotation', weekdays: [], rotation: ['r1'], perWeek: 4, habitId: 'h1', updatedAt: '' }
    const d = migrate({
      goals: [{ id: 'g', link: { kind: 'workouts' } }], exercises: [{ id: 'e1' }], program, settings: { weightUnit: 'lb' },
    }, 7)
    expect(d.goals[0].link).toEqual({ kind: 'workouts' })
    expect(d.exercises).toEqual([{ id: 'e1' }])
    expect(d.program).toEqual(program)
    expect(d.settings.weightUnit).toBe('lb')
  })
  it('an unknown unit falls back to kg', () => {
    expect(migrate({ settings: { weightUnit: 'stone' } }, SCHEMA_VERSION).settings.weightUnit).toBe('kg')
  })
  it('a v7 backup restores with training added and nothing lost', () => {
    const b = { app: 'itqan', schemaVersion: 7, exportedAt: '', data: { areas: [], ...v7() } }
    const d = parseBackup(JSON.stringify(b))
    expect(d.workouts).toEqual([])
    expect(d.goals[0].link).toBeNull()
    expect(d.tasks).toEqual(v7().tasks)
  })
})

describe('v8 → v9 (flexible program mode)', () => {
  it('changes nothing stored: a v8 program and training data come through exactly', () => {
    const program = { mode: 'rotation', weekdays: [null, null, null, null, null, null, null], rotation: ['r1'], perWeek: 3, habitId: 'h', updatedAt: 'x' }
    const v8 = { program, workouts: [{ id: 'w' }], workoutSets: [{ id: 's' }], exercises: [{ id: 'e' }], routines: [{ id: 'r1' }], settings: { weightUnit: 'lb' } }
    const d = migrate(v8, 8)
    expect(d.program).toEqual(program)
    expect(d.workouts).toEqual(v8.workouts)
    expect(d.workoutSets).toEqual(v8.workoutSets)
    expect(d.settings.weightUnit).toBe('lb')
  })
  it('a v8 backup restores unchanged', () => {
    const b = { app: 'itqan', schemaVersion: 8, exportedAt: '', data: { areas: [], tasks: [], habits: [], goals: [], program: null } }
    expect(parseBackup(JSON.stringify(b)).program).toBeNull()
  })
})

describe('v9 → v10 (focus sessions for a habit)', () => {
  it('existing sessions and a running timer are for no habit; every other field comes through', () => {
    const session = { id: 'f1', startedAt: '2026-10-20T08:00:00.000Z', minutes: 25, label: 'Read', areaId: 'a', goalId: 'g', taskId: null }
    const timer = { mode: 'focus', endsAt: null, remainingMs: 1000, totalMs: 1500000, startedAt: 'x', label: 'L', areaId: null, goalId: null, taskId: 't' }
    const d = migrate({ focusSessions: [session], timer, habitLogs: { h: { '2026-10-20': 3 } } }, 9)
    expect(d.focusSessions).toEqual([{ ...session, habitId: null, habitAmount: 0 }])
    expect(d.timer).toEqual({ ...timer, habitId: null })
    expect(d.habitLogs).toEqual({ h: { '2026-10-20': 3 } })
  })
  it('no timer stays no timer, and fields already there are kept', () => {
    const d = migrate({ timer: null, focusSessions: [{ id: 'f', habitId: 'h', habitAmount: 2 }] }, 9)
    expect(d.timer).toBeNull()
    expect(d.focusSessions).toEqual([{ id: 'f', habitId: 'h', habitAmount: 2 }])
  })
  it('a v9 backup restores with its sessions', () => {
    const b = { app: 'itqan', schemaVersion: 9, exportedAt: '', data: { areas: [], tasks: [], habits: [], goals: [], focusSessions: [{ id: 'f', minutes: 10 }] } }
    expect(parseBackup(JSON.stringify(b)).focusSessions).toEqual([{ id: 'f', minutes: 10, habitId: null, habitAmount: 0 }])
  })
})

describe('v10 → v11 (notifications, ADR-031)', () => {
  it('this device keeps announcing everything and no device is registered for pushes; nothing else changes', () => {
    const settings = { name: 'Sam', sound: false, daily: { verse: false } }
    const d = migrate({ settings, tasks: [{ id: 't' }], focusSessions: [{ id: 'f', minutes: 25 }] }, 10)
    expect(d.settings.notify).toEqual({ on: true, timer: true, reminders: true, checkIns: true })
    expect(d.settings.name).toBe('Sam')
    expect(d.settings.sound).toBe(false)
    expect(d.settings.daily.verse).toBe(false)
    expect(d.pushTargets).toEqual([])
    expect(d.tasks).toEqual([{ id: 't' }])
    expect(d.focusSessions).toEqual([{ id: 'f', minutes: 25 }])
  })
  it('choices and registrations already there are kept, and a missing choice gets its default', () => {
    const target = { id: 'p', label: 'iPhone', endpoint: 'https://web.push.apple.com/x' }
    const d = migrate({ settings: { notify: { timer: false } }, pushTargets: [target] }, 10)
    expect(d.settings.notify).toEqual({ on: true, timer: false, reminders: true, checkIns: true })
    expect(d.pushTargets).toEqual([{ ...target, kinds: { timer: true, reminders: true, checkIns: true } }])
  })
  it('a v10 backup restores with notifications on', () => {
    const b = { app: 'itqan', schemaVersion: 10, exportedAt: '', data: { areas: [], tasks: [], habits: [], goals: [], settings: { theme: 'dark' } } }
    const d = parseBackup(JSON.stringify(b))
    expect(d.settings.notify.on).toBe(true)
    expect(d.settings.theme).toBe('dark')
    expect(d.pushTargets).toEqual([])
  })
})

describe('v11 → v12 (reminders and check-ins pushed, ADR-033)', () => {
  it('a registered device gets every kind, and every other field of it comes through', () => {
    const target = { id: 'p', label: 'iPhone', endpoint: 'https://web.push.apple.com/x', p256dh: 'k', auth: 'a', vapidPublic: 'v', vapidPrivate: { kty: 'EC' }, subject: 's', createdAt: 'c', updatedAt: 'u' }
    const d = migrate({ pushTargets: [target], tasks: [{ id: 't' }], settings: { notify: { on: true, timer: true, reminders: false, checkIns: true } } }, 11)
    expect(d.pushTargets).toEqual([{ ...target, kinds: { timer: true, reminders: true, checkIns: true } }])
    expect(d.tasks).toEqual([{ id: 't' }])
    expect(d.settings.notify.reminders).toBe(false)
  })
  it('choices already there are kept; no devices stays no devices', () => {
    const d = migrate({ pushTargets: [{ id: 'p', kinds: { reminders: false } }] }, 11)
    expect(d.pushTargets[0].kinds).toEqual({ timer: true, reminders: false, checkIns: true })
    expect(migrate({}, 11).pushTargets).toEqual([])
  })
  it('a v11 backup restores with its devices registered for every kind', () => {
    const b = { app: 'itqan', schemaVersion: 11, exportedAt: '', data: { areas: [], tasks: [], habits: [], goals: [], pushTargets: [{ id: 'p', label: 'iPhone' }] } }
    expect(parseBackup(JSON.stringify(b)).pushTargets).toEqual([{ id: 'p', label: 'iPhone', kinds: { timer: true, reminders: true, checkIns: true } }])
  })
  it('a v10 backup comes all the way up without inventing devices', () => {
    expect(migrate({ settings: {} }, 10).pushTargets).toEqual([])
  })
})

describe('v12 → v13 (notes, ADR-035)', () => {
  it('adds an empty notes collection and keeps every existing record exactly', () => {
    const v12 = {
      tasks: [{ id: 't', title: 'Read', notes: 'p. 40' }], ideas: [{ id: 'i', notes: 'why' }], projects: [{ id: 'p', notes: 'long text' }],
      memories: [{ id: 'm' }], pushTargets: [{ id: 'x', kinds: { timer: true, reminders: false, checkIns: true } }], settings: { name: 'Sam', language: 'ar' },
    }
    const d = migrate(structuredClone(v12), 12)
    expect(d.notes).toEqual([])
    expect(d.tasks).toEqual(v12.tasks)
    expect(d.ideas).toEqual(v12.ideas)
    expect(d.projects).toEqual(v12.projects)
    expect(d.memories).toEqual(v12.memories)
    expect(d.pushTargets).toEqual(v12.pushTargets)
    expect(d.settings).toMatchObject({ name: 'Sam', language: 'ar' })
  })
  it('never overwrites notes already there', () => {
    const notes = [{ id: 'n', title: 'Gate code', body: '4512', items: [] }]
    expect(migrate({ notes }, 12).notes).toEqual(notes)
    expect(migrate({ notes }, SCHEMA_VERSION).notes).toEqual(notes)
  })
  it('a v12 backup restores with an empty notes list, and a v1 backup comes all the way up', () => {
    const b = { app: 'itqan', schemaVersion: 12, exportedAt: '', data: { areas: [], tasks: [{ id: 't' }], habits: [], goals: [] } }
    const d = parseBackup(JSON.stringify(b))
    expect(d.notes).toEqual([])
    expect(d.tasks).toEqual([{ id: 't' }])
    expect(migrate({ tasks: [] }, 1).notes).toEqual([])
  })
  it('a backup with notes round-trips exactly', () => {
    const data = { ...emptyData(), notes: [{
      id: 'n', title: 'Shopping', body: '', items: [{ id: 'a', text: 'Milk', done: true, taskId: null }], color: 'amber' as const,
      labels: ['home'], pinned: true, archived: false, areaId: null, projectId: null, goalId: null, taskIds: [], createdAt: 'c', updatedAt: 'u',
    }] }
    expect(parseBackup(JSON.stringify(toBackup(data)))).toEqual(data)
  })
})
