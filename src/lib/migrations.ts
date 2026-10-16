import { DEFAULT_SETTINGS, emptyData } from './seed'
import type { Data } from './types'

/**
 * Persisted-data schema version. Bump it whenever a persisted shape in types.ts changes,
 * and add a step below. Losing the owner's history is the one unrecoverable failure in this
 * app (CLAUDE.md, rule 3), so a migration is never optional and always has a test.
 */
export const SCHEMA_VERSION = 3

type Step = (d: Record<string, unknown>) => Record<string, unknown>

/** steps[n] upgrades data from version n to n + 1. */
const steps: Record<number, Step> = {
  // 1 → 2 (2026-10-16): Memories, Ideas and Reminders arrive. Everything else is untouched.
  1: (d) => ({ ...d, memories: d.memories ?? [], ideas: d.ideas ?? [], reminders: d.reminders ?? [] }),
  // 2 → 3 (2026-10-16): Projects and Connections. Tasks may belong to a project; reminders may be
  // about a person. Existing tasks and reminders gain a null link — nothing else changes.
  2: (d) => ({
    ...d,
    tasks: ((d.tasks as Record<string, unknown>[] | undefined) ?? []).map((t) => ({ projectId: null, ...t })),
    reminders: ((d.reminders as Record<string, unknown>[] | undefined) ?? []).map((r) => ({ contactId: null, countYears: true, ...r })),
    projects: d.projects ?? [],
    contacts: d.contacts ?? [],
    interactions: d.interactions ?? [],
  }),
}

export function migrate(raw: unknown, fromVersion: number): Data {
  let d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const step = steps[v]
    if (step) d = step(d)
  }
  return normalize(d)
}

/** Fill any missing collection with its empty value, so older or partial data never crashes the UI. */
export function normalize(d: Record<string, unknown>): Data {
  const base = emptyData()
  const pick = <K extends keyof Data>(k: K): Data[K] => (d[k] ?? base[k]) as Data[K]
  return {
    areas: pick('areas'),
    tasks: pick('tasks'),
    habits: pick('habits'),
    habitLogs: pick('habitLogs'),
    goals: pick('goals'),
    goalLogs: pick('goalLogs'),
    focusSessions: pick('focusSessions'),
    timer: pick('timer'),
    dayNotes: pick('dayNotes'),
    reviews: pick('reviews'),
    memories: pick('memories'),
    ideas: pick('ideas'),
    reminders: pick('reminders'),
    projects: pick('projects'),
    contacts: pick('contacts'),
    interactions: pick('interactions'),
    settings: { ...DEFAULT_SETTINGS, ...((d.settings as object) ?? {}) },
  }
}
