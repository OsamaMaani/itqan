import { describe, expect, it } from 'vitest'
import { backupNudge } from '../backup'

const DAY = 86_400_000
const now = Date.parse('2026-10-30T12:00:00.000Z')
const base = { onboarded: true, lastBackupAt: null, firstTaskAt: now - 30 * DAY, lastSyncAt: null }

describe('backupNudge — when opening Itqan suggests a backup', () => {
  it('a browser holding the only copy for two weeks is told so', () => {
    expect(backupNudge(base, now)).toBe('never')
  })
  it('a synced browser is not: a sync is a backup (the owner, 2026-10-30)', () => {
    expect(backupNudge({ ...base, lastSyncAt: now - 60_000 }, now)).toBeNull()
    expect(backupNudge({ ...base, lastSyncAt: now - 13 * DAY }, now)).toBeNull()
  })
  it('sync that stopped working two weeks ago brings the reminder back, as “due”, not “only here”', () => {
    expect(backupNudge({ ...base, lastSyncAt: now - 15 * DAY }, now)).toBe('due')
  })
  it('a recent download counts; an old one is due', () => {
    expect(backupNudge({ ...base, lastBackupAt: new Date(now - 3 * DAY).toISOString() }, now)).toBeNull()
    expect(backupNudge({ ...base, lastBackupAt: new Date(now - 20 * DAY).toISOString() }, now)).toBe('due')
  })
  it('the newer of download and sync decides', () => {
    expect(backupNudge({ ...base, lastBackupAt: new Date(now - 20 * DAY).toISOString(), lastSyncAt: now - DAY }, now)).toBeNull()
  })
  it('nothing in the first two weeks of use, or before onboarding', () => {
    expect(backupNudge({ ...base, firstTaskAt: now - 5 * DAY }, now)).toBeNull()
    expect(backupNudge({ ...base, onboarded: false }, now)).toBeNull()
  })
})
