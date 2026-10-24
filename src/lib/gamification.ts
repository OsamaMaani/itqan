import { addDaysKey, diffDays, rangeKeys, toKey } from './date'
import { isMetOn, streak } from './habits'
import { bestWeekRun, plannedPerWeek, recordCounts } from './training'
import type { Data, DateKey } from './types'

/**
 * XP is **derived from history, never stored** (ADR-005). Undoing a task removes its XP,
 * deleting a habit removes its XP, and no counter can drift away from what really happened.
 */

export const XP = {
  task: 10,
  taskPriority: 5, // per priority level
  subtask: 2,
  habitDay: 8,
  focusMinute: 1,
  goalLog: 5,
  milestone: 25,
  goalDone: 150,
  review: 30,
  intention: 3,
  memory: 5,
  idea: 2,
  ideaDone: 20,
  checkIn: 5,
  achievement: 5,
  projectDone: 100,
  workout: 30,
  record: 10, // per new personal record in a workout, at most three a workout
} as const

export type XpKind = 'task' | 'habit' | 'focus' | 'goal' | 'review' | 'intention' | 'memory' | 'idea' | 'people' | 'project' | 'achievement' | 'training'

export interface XpEvent {
  date: DateKey
  xp: number
  kind: XpKind
}

function dayOf(iso: string): DateKey {
  return toKey(new Date(iso))
}

export function xpEvents(d: Data): XpEvent[] {
  const ev: XpEvent[] = []

  for (const t of d.tasks) {
    if (!t.done || !t.doneAt) continue
    const sub = t.subtasks.filter((s) => s.done).length
    ev.push({ date: dayOf(t.doneAt), kind: 'task', xp: XP.task + t.priority * XP.taskPriority + sub * XP.subtask })
  }

  for (const h of d.habits) {
    for (const [day] of Object.entries(d.habitLogs[h.id] ?? {})) {
      if (isMetOn(h, d.habitLogs, day)) ev.push({ date: day, kind: 'habit', xp: XP.habitDay })
    }
  }

  for (const s of d.focusSessions) {
    ev.push({ date: dayOf(s.startedAt), kind: 'focus', xp: Math.round(s.minutes * XP.focusMinute) })
  }

  for (const l of d.goalLogs) ev.push({ date: l.date, kind: 'goal', xp: XP.goalLog })
  for (const g of d.goals) {
    for (const m of g.milestones) if (m.done && m.doneAt) ev.push({ date: dayOf(m.doneAt), kind: 'goal', xp: XP.milestone })
    if (g.status === 'done' && g.completedAt) ev.push({ date: dayOf(g.completedAt), kind: 'goal', xp: XP.goalDone })
  }

  for (const r of Object.values(d.reviews)) ev.push({ date: dayOf(r.savedAt), kind: 'review', xp: XP.review })
  for (const [day, n] of Object.entries(d.dayNotes)) {
    if (n.intention.trim()) ev.push({ date: day, kind: 'intention', xp: XP.intention })
  }
  for (const m of d.memories ?? []) ev.push({ date: dayOf(m.createdAt), kind: 'memory', xp: XP.memory })
  for (const i of d.ideas ?? []) {
    ev.push({ date: dayOf(i.createdAt), kind: 'idea', xp: XP.idea })
    if (i.status === 'done') ev.push({ date: dayOf(i.updatedAt), kind: 'idea', xp: XP.ideaDone })
  }
  for (const a of d.achievements ?? []) ev.push({ date: dayOf(a.createdAt), kind: 'achievement', xp: XP.achievement })
  for (const x of d.interactions ?? []) ev.push({ date: x.date, kind: 'people', xp: XP.checkIn })
  for (const p of d.projects ?? []) if (p.status === 'done') ev.push({ date: dayOf(p.updatedAt), kind: 'project', xp: XP.projectDone })
  // A finished workout counts on the day it started, like everything in Training (ADR-027).
  const records = recordCounts(d.workouts ?? [], d.workoutSets ?? [])
  for (const w of d.workouts ?? []) {
    if (!w.finishedAt) continue
    const prs = Math.min(3, records.get(w.id) ?? 0)
    ev.push({ date: w.date, kind: 'training', xp: XP.workout + prs * XP.record })
  }
  return ev
}

export function totalXp(events: XpEvent[]): number {
  return events.reduce((s, e) => s + e.xp, 0)
}

export function xpOn(events: XpEvent[], day: DateKey): number {
  return events.filter((e) => e.date === day).reduce((s, e) => s + e.xp, 0)
}

export function xpByDay(events: XpEvent[]): Record<DateKey, number> {
  const out: Record<DateKey, number> = {}
  for (const e of events) out[e.date] = (out[e.date] ?? 0) + e.xp
  return out
}

/** XP needed to go from `level` to `level + 1`. Grows by 50 each level. */
export function xpForNext(level: number): number {
  return 100 + 50 * (level - 1)
}

/** Total XP needed to *reach* `level` (level 1 = 0). */
export function xpToReach(level: number): number {
  const n = level - 1
  return 100 * n + 25 * n * (n - 1)
}

export interface LevelInfo {
  level: number
  into: number
  needed: number
  progress: number
  /** Index into the level titles (`m.levels`): a new title every 3 levels, the last at level 31. */
  rank: number
}

export const LEVEL_TITLES = 11

export function levelInfo(xp: number): LevelInfo {
  let level = 1
  while (xpToReach(level + 1) <= xp) level++
  const into = xp - xpToReach(level)
  const needed = xpForNext(level)
  const rank = Math.min(LEVEL_TITLES - 1, Math.floor((level - 1) / 3))
  return { level, into, needed, progress: into / needed, rank }
}

// --- the day streak and streak savers (ADR-034) -----------------------------------------

/** One streak saver for every `xpPerSaver` XP earned; at most `maxHeld` held at once. */
export const SAVERS = { xpPerSaver: 500, maxHeld: 2 } as const

export interface DayStreak {
  /** Active days in the current run. A day a saver covered keeps the run alive but adds nothing. */
  current: number
  best: number
  /** Savers held now. */
  held: number
  /** Savers ever received (a threshold crossed while already full gives nothing). */
  earned: number
  used: number
  /** XP earned toward the next saver, out of `SAVERS.xpPerSaver`. */
  towardNext: number
  /** Every day a saver covered, oldest first. */
  saved: DateKey[]
  /** Has anything been done today? Until then today is pending and never a miss. */
  todayActive: boolean
}

/**
 * The flame on Today: consecutive days with any activity, kept alive by streak savers — derived
 * from history like everything else here, so nothing is stored and nothing can drift (ADR-005).
 *
 * Walking day by day from the first active day:
 * - an active day adds one to the run, and its XP counts toward savers (they arrive at the end of
 *   the day they were earned, so they protect the days after it);
 * - a gap of missed days is covered only if every day of it can be: a gap of g days with g or more
 *   savers held uses g of them and the run continues; a longer gap ends the run and **keeps** the
 *   savers, instead of spending them on a streak that was lost anyway;
 * - today is pending until something is done, and is never part of a gap.
 * Backfilling a missed day therefore gives its saver back.
 */
export function dayStreak(events: XpEvent[], today: DateKey): DayStreak {
  const xp = new Map<DateKey, number>()
  for (const e of events) if (e.date <= today) xp.set(e.date, (xp.get(e.date) ?? 0) + e.xp)
  const out: DayStreak = { current: 0, best: 0, held: 0, earned: 0, used: 0, towardNext: 0, saved: [], todayActive: xp.has(today) }
  if (!xp.size) return out

  let first = today
  for (const k of xp.keys()) if (k < first) first = k
  let total = 0
  let granted = 0
  let gap: DateKey[] = []
  const closeGap = () => {
    if (!gap.length) return
    if (out.current > 0 && gap.length <= out.held) {
      out.held -= gap.length
      out.used += gap.length
      out.saved.push(...gap)
    } else {
      out.current = 0
    }
    gap = []
  }

  for (const k of rangeKeys(first, today)) {
    const x = xp.get(k)
    if (x === undefined) {
      if (k < today) gap.push(k)
      continue
    }
    closeGap()
    out.current++
    out.best = Math.max(out.best, out.current)
    total += Math.max(0, x)
    for (const reached = Math.floor(total / SAVERS.xpPerSaver); granted < reached; granted++) {
      if (out.held < SAVERS.maxHeld) { out.held++; out.earned++ }
    }
  }
  closeGap()
  out.towardNext = total % SAVERS.xpPerSaver
  return out
}

/** How many days just before today a saver covered — the gap it bridged, if it ended yesterday. */
export function savedJustBefore(s: DayStreak, today: DateKey): number {
  let n = 0
  const set = new Set(s.saved)
  for (let k = addDaysKey(today, -1); set.has(k); k = addDaysKey(k, -1)) n++
  return n
}

// --- badges (game rewards; not to be confused with the owner's real Achievements) ------

/** A badge's name and description are `m.badges[id]`. */
export interface Badge {
  id: BadgeId
  emoji: string
  unlocked: boolean
}

export type BadgeId =
  | 'first-step' | 'tasks-50' | 'tasks-250' | 'streak-7' | 'streak-30' | 'streak-100' | 'active-14'
  | 'focus-10h' | 'focus-100h' | 'focus-90' | 'goal-1' | 'goal-5' | 'review-4' | 'early' | 'owl'
  | 'level-5' | 'level-10' | 'days-30' | 'memories-10' | 'ideas-25' | 'idea-done' | 'project-done'
  | 'proud-10' | 'people-10' | 'people-50' | 'workout-1' | 'workouts-10' | 'workouts-50' | 'record-1' | 'weeks-4'

export function badges(d: Data, today: DateKey): Badge[] {
  const ev = xpEvents(d)
  const xp = totalXp(ev)
  const lvl = levelInfo(xp).level
  const tasksDone = d.tasks.filter((t) => t.done).length
  const focusMin = d.focusSessions.reduce((s, f) => s + f.minutes, 0)
  const goalsDone = d.goals.filter((g) => g.status === 'done').length
  const bestHabit = Math.max(0, ...d.habits.map((h) => streak(h, d.habitLogs, today, d.settings.weekStartsOn).best))
  const reviews = Object.keys(d.reviews).length
  const early = d.tasks.some((t) => t.doneAt && new Date(t.doneAt).getHours() < 7)
  const owl = d.focusSessions.some((f) => new Date(f.startedAt).getHours() >= 22)
  // The best run, not the current one: a badge once earned is never taken back.
  const active = dayStreak(ev, today).best
  const longFocus = d.focusSessions.some((f) => f.minutes >= 90)
  const firstDay = ev.reduce<DateKey | null>((m, e) => (m === null || e.date < m ? e.date : m), null)
  const daysUsed = firstDay ? diffDays(today, firstDay) + 1 : 0
  const memories = (d.memories ?? []).length
  const ideas = d.ideas ?? []
  const finished = (d.workouts ?? []).filter((w) => w.finishedAt)
  const records = recordCounts(d.workouts ?? [], d.workoutSets ?? [])
  const record = finished.some((w) => (records.get(w.id) ?? 0) > 0)
  const weekRun = bestWeekRun(finished, plannedPerWeek(d.program, d.routines ?? []), d.settings.weekStartsOn, today)

  const a = (id: BadgeId, emoji: string, unlocked: boolean): Badge => ({ id, emoji, unlocked })

  return [
    a('first-step', '👣', tasksDone >= 1),
    a('tasks-50', '✅', tasksDone >= 50),
    a('tasks-250', '🏗️', tasksDone >= 250),
    a('streak-7', '🔥', bestHabit >= 7),
    a('streak-30', '🌙', bestHabit >= 30),
    a('streak-100', '💎', bestHabit >= 100),
    a('active-14', '⚡', active >= 14),
    a('focus-10h', '🎯', focusMin >= 600),
    a('focus-100h', '🧠', focusMin >= 6000),
    a('focus-90', '🏔️', longFocus),
    a('goal-1', '🏆', goalsDone >= 1),
    a('goal-5', '👑', goalsDone >= 5),
    a('review-4', '📓', reviews >= 4),
    a('early', '🌅', early),
    a('owl', '🦉', owl),
    a('level-5', '⭐', lvl >= 5),
    a('level-10', '🌟', lvl >= 10),
    a('days-30', '🗓️', daysUsed >= 30),
    a('memories-10', '📸', memories >= 10),
    a('ideas-25', '💡', ideas.length >= 25),
    a('idea-done', '🚀', ideas.some((i) => i.status === 'done')),
    a('project-done', '🏁', (d.projects ?? []).some((p) => p.status === 'done')),
    a('proud-10', '🏅', (d.achievements ?? []).length >= 10),
    a('people-10', '🫶', (d.interactions ?? []).length >= 10),
    a('people-50', '🤝', (d.interactions ?? []).length >= 50),
    a('workout-1', '🏋️', finished.length >= 1),
    a('workouts-10', '💪', finished.length >= 10),
    a('workouts-50', '🦾', finished.length >= 50),
    a('record-1', '📈', record),
    a('weeks-4', '🗓️', weekRun >= 4),
  ]
}
