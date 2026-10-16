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
    throw new Error('That file is not valid JSON.')
  }
  const b = json as Partial<BackupFile>
  if (!b || b.app !== 'itqan' || typeof b.schemaVersion !== 'number' || !b.data) {
    throw new Error('That file is not an Itqan backup.')
  }
  if (b.schemaVersion > SCHEMA_VERSION) {
    throw new Error('This backup is from a newer version of Itqan. Update the app first.')
  }
  const d = b.data as unknown as Record<string, unknown>
  for (const k of ['areas', 'tasks', 'habits', 'goals'] as const) {
    if (!Array.isArray(d[k])) throw new Error(`The backup is damaged: "${k}" is missing.`)
  }
  return migrate(d, b.schemaVersion)
}
