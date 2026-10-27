import { DEFAULT_SETTINGS, emptyData } from './seed'
import { UI_LANGUAGES, type Data, type Settings, type UiLanguage } from './types'

/**
 * Persisted-data schema version. Bump it whenever a persisted shape in types.ts changes,
 * and add a step below. Losing the owner's history is the one unrecoverable failure in this
 * app (CLAUDE.md, rule 3), so a migration is never optional and always has a test.
 */
export const SCHEMA_VERSION = 16

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
  // 3 → 4 (2026-10-16): project boards, manual progress and updates. Tasks start "to do" and not
  // blocked; projects keep task-based progress and the list view they had.
  3: (d) => ({
    ...d,
    tasks: ((d.tasks as Record<string, unknown>[] | undefined) ?? []).map((t) => ({ stage: 'todo', blocked: false, ...t })),
    projects: ((d.projects as Record<string, unknown>[] | undefined) ?? []).map((p) => ({
      progressMode: 'tasks', manualProgress: 0, view: 'list', pinned: false, ...p,
    })),
    projectUpdates: d.projectUpdates ?? [],
  }),
  // 4 → 5 (2026-10-16): Achievements. A new collection; nothing existing changes.
  4: (d) => ({ ...d, achievements: d.achievements ?? [] }),
  // 5 → 6 (2026-10-17): the daily card's settings (ADR-023) — everything on, French B1. Only a new
  // settings field; no record changes.
  5: (d) => {
    const settings = (d.settings as Record<string, unknown> | undefined) ?? {}
    return { ...d, settings: { ...settings, daily: { ...DEFAULT_SETTINGS.daily, ...((settings.daily as object) ?? {}) } } }
  },
  // 6 → 7 (2026-10-17): interface language (ADR-024). Existing data keeps English — nothing
  // changes on screen until the owner picks another language.
  6: (d) => {
    const settings = (d.settings as Record<string, unknown> | undefined) ?? {}
    return { ...d, settings: { ...settings, language: settings.language ?? 'en' } }
  },
  // 7 → 8 (2026-10-20): Training (ADR-027). New collections start empty and the program unset;
  // goals gain a null link (check-ins as before); weights show in kg. Nothing existing changes.
  7: (d) => {
    const settings = (d.settings as Record<string, unknown> | undefined) ?? {}
    return {
      ...d,
      goals: ((d.goals as Record<string, unknown>[] | undefined) ?? []).map((g) => ({ link: null, ...g })),
      exercises: d.exercises ?? [],
      routines: d.routines ?? [],
      program: d.program ?? null,
      workouts: d.workouts ?? [],
      workoutSets: d.workoutSets ?? [],
      settings: { ...settings, weightUnit: settings.weightUnit ?? 'kg' },
    }
  },
  // 8 → 9 (2026-10-21): a third program mode, 'flexible' — train whenever you can (ADR-028).
  // Nothing stored changes; the version moves so a device that doesn't know the mode stops
  // syncing and asks to be updated instead of misreading it.
  8: (d) => d,
  // 9 → 10 (2026-10-21): a focus session can be for a habit (ADR-029). Existing sessions — and a
  // timer running during the upgrade — are for no habit and added nothing to one.
  9: (d) => ({
    ...d,
    focusSessions: ((d.focusSessions as Record<string, unknown>[] | undefined) ?? []).map((f) => ({ habitId: null, habitAmount: 0, ...f })),
    timer: d.timer && typeof d.timer === 'object' ? { habitId: null, ...(d.timer as object) } : (d.timer ?? null),
  }),
  // 10 → 11 (2026-10-23): notifications (ADR-031). This device announces everything, as before;
  // no device is registered for pushes yet. Nothing existing changes.
  10: (d) => {
    const settings = (d.settings as Record<string, unknown> | undefined) ?? {}
    return {
      ...d,
      pushTargets: d.pushTargets ?? [],
      settings: { ...settings, notify: { ...DEFAULT_SETTINGS.notify, ...((settings.notify as object) ?? {}) } },
    }
  },
  // 11 → 12 (2026-10-24): reminders and check-ins are pushed to the phone too (ADR-033). A device
  // already registered asked for alerts from the laptop, so it gets every kind; the phone itself
  // narrows that to its own choices the next time it opens (refreshPush). Nothing else changes.
  11: (d) => ({
    ...d,
    pushTargets: ((d.pushTargets as Record<string, unknown>[] | undefined) ?? []).map((t) => ({
      ...t, kinds: { timer: true, reminders: true, checkIns: true, ...((t.kinds as object | undefined) ?? {}) },
    })),
  }),
  // 12 → 13 (2026-10-26): Notes (ADR-035). A new collection; nothing existing changes.
  12: (d) => ({ ...d, notes: d.notes ?? [] }),
  // 13 → 14 (2026-10-26): a note can be pinned to Today (ADR-036). Existing notes are not on
  // Today — pinned ones stay pinned on the Notes screen only. Nothing else changes.
  13: (d) => ({
    ...d,
    notes: ((d.notes as Record<string, unknown>[] | undefined) ?? []).map((n) => ({ onToday: false, ...n })),
  }),
  // 14 → 15 (2026-10-27): a counted habit may have a round — 604 pages of the Quran (ADR-038).
  // Existing habits have none; their logs and streaks are untouched.
  14: (d) => ({
    ...d,
    habits: ((d.habits as Record<string, unknown>[] | undefined) ?? []).map((h) => ({ round: null, ...h })),
  }),
  // 15 → 16 (2026-10-28): a day may start at Fajr (ADR-041). It is off — no span — so every day
  // stays exactly as it was; the Fajr choices start at "the time zone's city, its usual angle".
  15: (d) => {
    const settings = (d.settings as Record<string, unknown> | undefined) ?? {}
    return {
      ...d,
      fajrSpans: d.fajrSpans ?? [],
      settings: { ...settings, fajr: { ...DEFAULT_SETTINGS.fajr, ...((settings.fajr as object) ?? {}) } },
    }
  },
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
    notes: pick('notes'),
    reminders: pick('reminders'),
    projects: pick('projects'),
    projectUpdates: pick('projectUpdates'),
    contacts: pick('contacts'),
    interactions: pick('interactions'),
    achievements: pick('achievements'),
    exercises: pick('exercises'),
    routines: pick('routines'),
    program: pick('program'),
    workouts: pick('workouts'),
    workoutSets: pick('workoutSets'),
    pushTargets: pick('pushTargets'),
    fajrSpans: pick('fajrSpans'),
    settings: normalizeSettings(d.settings),
  }
}

/** Saved settings over the defaults; nested objects are merged too, so a missing key gets its default. */
function normalizeSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>
  const language = UI_LANGUAGES.includes(s.language as UiLanguage) ? (s.language as UiLanguage) : DEFAULT_SETTINGS.language
  const weightUnit = s.weightUnit === 'lb' ? 'lb' : 'kg'
  return {
    ...DEFAULT_SETTINGS, ...s,
    daily: { ...DEFAULT_SETTINGS.daily, ...(s.daily ?? {}) },
    notify: { ...DEFAULT_SETTINGS.notify, ...(s.notify ?? {}) },
    fajr: { ...DEFAULT_SETTINGS.fajr, ...(s.fajr ?? {}) },
    language, weightUnit,
  }
}
