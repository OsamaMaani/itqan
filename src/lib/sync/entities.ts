import type { Data, Settings } from '../types'

/**
 * Sync works on *entities*: every independently-editable piece of data gets a stable key, so
 * two devices can edit different things and both edits survive (ADR-016).
 *
 *   tasks:<id>  habits:<id>  …        one per item in each array collection
 *   habitLogs:<habitId>|<day>         one per habit per day
 *   dayNotes:<day>  reviews:<week>    one per day / week
 *   settings:shared                   the settings that should follow you across devices
 *
 * Device-local, never synced: the running focus timer, theme, sounds, onboarding and backup
 * dates — each device keeps its own.
 */

export type Entities = Record<string, unknown>

export const ARRAY_COLLECTIONS = [
  'areas', 'tasks', 'habits', 'goals', 'goalLogs', 'focusSessions', 'memories', 'ideas', 'reminders',
  'projects', 'projectUpdates', 'contacts', 'interactions', 'achievements',
] as const
type ArrayCollection = (typeof ARRAY_COLLECTIONS)[number]

export const SHARED_SETTINGS = ['name', 'weekStartsOn', 'focusMinutes', 'breakMinutes', 'showHijri'] as const

export function toEntities(d: Data): Entities {
  const e: Entities = {}
  for (const col of ARRAY_COLLECTIONS) {
    for (const item of d[col] as { id: string }[]) e[`${col}:${item.id}`] = item
  }
  for (const [hid, days] of Object.entries(d.habitLogs)) {
    for (const [day, amount] of Object.entries(days)) e[`habitLogs:${hid}|${day}`] = amount
  }
  for (const [day, note] of Object.entries(d.dayNotes)) e[`dayNotes:${day}`] = note
  for (const [week, r] of Object.entries(d.reviews)) e[`reviews:${week}`] = r
  // A string, so an unchanged value compares equal by === (objects would be new every time).
  e['settings:shared'] = JSON.stringify(Object.fromEntries(SHARED_SETTINGS.map((k) => [k, d.settings[k]])))
  return e
}

function sortKey(item: Record<string, unknown>): string {
  return String(item.createdAt ?? item.startedAt ?? '')
}

/**
 * Rebuilds Data from entities. Items this device already had keep their order; new ones are
 * appended oldest first. Device-local state comes from `local`.
 */
export function fromEntities(e: Entities, local: Data): Data {
  const out: Data = {
    ...local,
    habitLogs: {},
    dayNotes: {},
    reviews: {},
  }
  for (const col of ARRAY_COLLECTIONS) {
    const prefix = `${col}:`
    const kept = (local[col] as { id: string }[]).filter((x) => `${prefix}${x.id}` in e).map((x) => e[`${prefix}${x.id}`])
    const known = new Set((local[col] as { id: string }[]).map((x) => x.id))
    const added = Object.keys(e)
      .filter((k) => k.startsWith(prefix) && !known.has(k.slice(prefix.length)))
      .map((k) => e[k] as Record<string, unknown>)
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    ;(out as unknown as Record<ArrayCollection, unknown[]>)[col] = [...kept, ...added]
  }
  for (const [k, v] of Object.entries(e)) {
    if (k.startsWith('habitLogs:')) {
      const [hid, day] = k.slice('habitLogs:'.length).split('|')
      ;(out.habitLogs[hid] ??= {})[day] = v as number
    } else if (k.startsWith('dayNotes:')) {
      out.dayNotes[k.slice('dayNotes:'.length)] = v as Data['dayNotes'][string]
    } else if (k.startsWith('reviews:')) {
      out.reviews[k.slice('reviews:'.length)] = v as Data['reviews'][string]
    }
  }
  const shared = e['settings:shared']
  if (typeof shared === 'string') {
    try { out.settings = { ...local.settings, ...(JSON.parse(shared) as Partial<Settings>) } } catch { /* keep local */ }
  }
  return out
}

/** True when the data holds anything a person created (ignores the shared-settings entity). */
export function hasUserData(e: Entities): boolean {
  return Object.keys(e).some((k) => k !== 'settings:shared')
}
