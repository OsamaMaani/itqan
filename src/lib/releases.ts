import { create } from 'zustand'
import { RELEASES, type Release } from '../content/releases'
import { addDaysKey } from './date'
import type { DateKey } from './types'

/**
 * What's new (ADR-040). Which update this device last saw is a per-device convenience kept in
 * localStorage: each device announces an update once. If storage is unavailable the dialog may
 * show again — never worse than that.
 */

const SEEN_KEY = 'itqan-seen-release'

export const LATEST_RELEASE = RELEASES.reduce((n, r) => Math.max(n, r.id), 0)

export function readSeen(): number | null {
  try {
    const v = localStorage.getItem(SEEN_KEY)
    return v === null ? null : Number(v) || 0
  } catch {
    return null
  }
}

export function markSeen(id: number = LATEST_RELEASE): void {
  try { localStorage.setItem(SEEN_KEY, String(id)) } catch { /* ignore */ }
}

/** How many updates the dialog shows at once; older ones are in Settings. */
export const MAX_ANNOUNCED = 3

/**
 * The updates to announce, newest first: those newer than the last one this device saw. A device
 * that never saw any (it had Itqan before this existed) gets the past week's. Updates with nothing
 * to show are skipped. A new user is marked as having seen everything when onboarding ends.
 */
export function toAnnounce(releases: Release[], seen: number | null, today: DateKey): Release[] {
  const since = addDaysKey(today, -7)
  return releases
    .filter((r) => r.items.length > 0 && (seen === null ? r.date >= since : r.id > seen))
    .sort((a, b) => b.id - a.id)
    .slice(0, MAX_ANNOUNCED)
}

/** Open the full history from anywhere (Settings). */
export const useWhatsNew = create<{ history: boolean }>(() => ({ history: false }))
