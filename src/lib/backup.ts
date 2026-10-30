import { tx } from '../i18n/core'
import { migrate, SCHEMA_VERSION } from './migrations'
import { todayKey } from './date'
import type { Data } from './types'

export interface BackupFile {
  app: 'itqan'
  schemaVersion: number
  exportedAt: string
  data: Data
}

export function toBackup(data: Data): BackupFile {
  return { app: 'itqan', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }
}

export function downloadBackup(data: Data): void {
  const blob = new Blob([JSON.stringify(toBackup(data), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `itqan-backup-${todayKey()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Parses and upgrades a backup. Throws with a readable message when the file is not one. */
export function parseBackup(text: string): Data {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(tx().m.errors.notJson)
  }
  const b = json as Partial<BackupFile>
  if (!b || b.app !== 'itqan' || typeof b.schemaVersion !== 'number' || !b.data) {
    throw new Error(tx().m.errors.notBackup)
  }
  if (b.schemaVersion > SCHEMA_VERSION) {
    throw new Error(tx().m.errors.newerBackup)
  }
  const d = b.data as unknown as Record<string, unknown>
  for (const k of ['areas', 'tasks', 'habits', 'goals'] as const) {
    if (!Array.isArray(d[k])) throw new Error(tx().f(tx().m.errors.damagedBackup, { field: k }))
  }
  return migrate(d, b.schemaVersion)
}

/** Days without a safe copy elsewhere before Itqan suggests a backup. */
export const BACKUP_NUDGE_DAYS = 14

/**
 * Whether to suggest a backup on opening (ADR-002), and which words: 'due' after a while without
 * one, 'never' when this browser holds the only copy. A successful sync is a backup too (ADR-016):
 * the encrypted copy in the private repo, with its history, restores onto any device — so while
 * sync keeps working the nudge never shows. Counted from the last download or sync, or from the
 * first task for someone who has had neither, so a new user is not nagged on day one.
 */
export function backupNudge(
  s: { onboarded: boolean; lastBackupAt: string | null; firstTaskAt: number; lastSyncAt: number | null }, now: number,
): 'due' | 'never' | null {
  if (!s.onboarded) return null
  const downloaded = s.lastBackupAt ? new Date(s.lastBackupAt).getTime() : 0
  const safe = Math.max(downloaded || 0, s.lastSyncAt ?? 0)
  if ((now - Math.max(safe, s.firstTaskAt)) / 86_400_000 < BACKUP_NUDGE_DAYS) return null
  return safe ? 'due' : 'never'
}
