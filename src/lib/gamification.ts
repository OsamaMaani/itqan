import { addDaysKey, diffDays, toKey } from './date'
import { isMetOn, streak } from './habits'
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
} as const

export type XpKind = 'task' | 'habit' | 'focus' | 'goal' | 'review' | 'intention' | 'memory' | 'idea'

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
  title: string
}

const TITLES = [
  'Beginner', 'Apprentice', 'Steady', 'Committed', 'Disciplined', 'Focused',
  'Consistent', 'Resilient', 'Expert', 'Master', 'Muttqin',
]

export function levelInfo(xp: number): LevelInfo {
  let level = 1
  while (xpToReach(level + 1) <= xp) level++
  const into = xp - xpToReach(level)
  const needed = xpForNext(level)
  const title = TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 3))]
  return { level, into, needed, progress: into / needed, title }
}

/** Consecutive days with any activity, ending today (an empty today does not break it). */
export function activeStreak(events: XpEvent[], today: DateKey): number {
  const days = new Set(events.map((e) => e.date))
  let n = 0
  let k = days.has(today) ? today : addDaysKey(today, -1)
  while (days.has(k)) { n++; k = addDaysKey(k, -1) }
  return n
}

// --- achievements ------------------------------------------------------------------

export interface Achievement {
  id: string
  emoji: string
  title: string
  description: string
  unlocked: boolean
}

export function achievements(d: Data, today: DateKey): Achievement[] {
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
  const active = activeStreak(ev, today)
  const longFocus = d.focusSessions.some((f) => f.minutes >= 90)
  const firstDay = ev.reduce<DateKey | null>((m, e) => (m === null || e.date < m ? e.date : m), null)
  const daysUsed = firstDay ? diffDays(today, firstDay) + 1 : 0
  const memories = (d.memories ?? []).length
  const ideas = d.ideas ?? []

  const a = (id: string, emoji: string, title: string, description: string, unlocked: boolean) =>
    ({ id, emoji, title, description, unlocked })

  return [
    a('first-step', '👣', 'First step', 'Complete your first task', tasksDone >= 1),
    a('tasks-50', '✅', 'Getting things done', 'Complete 50 tasks', tasksDone >= 50),
    a('tasks-250', '🏗️', 'Builder', 'Complete 250 tasks', tasksDone >= 250),
    a('streak-7', '🔥', 'One week strong', 'Keep a habit for 7 days in a row', bestHabit >= 7),
    a('streak-30', '🌙', 'A full month', 'Keep a habit for 30 days in a row', bestHabit >= 30),
    a('streak-100', '💎', 'Unbreakable', 'Keep a habit for 100 days in a row', bestHabit >= 100),
    a('active-14', '⚡', 'Momentum', 'Be active 14 days in a row', active >= 14),
    a('focus-10h', '🎯', 'Deep worker', 'Log 10 hours of focus', focusMin >= 600),
    a('focus-100h', '🧠', 'Scholar', 'Log 100 hours of focus', focusMin >= 6000),
    a('focus-90', '🏔️', 'Flow state', 'Finish a 90-minute focus session', longFocus),
    a('goal-1', '🏆', 'Goal getter', 'Complete a goal', goalsDone >= 1),
    a('goal-5', '👑', 'Achiever', 'Complete 5 goals', goalsDone >= 5),
    a('review-4', '📓', 'Reflective', 'Write 4 weekly reviews', reviews >= 4),
    a('early', '🌅', 'Early bird', 'Finish a task before 7 AM', early),
    a('owl', '🦉', 'Night owl', 'Start a focus session after 10 PM', owl),
    a('level-5', '⭐', 'Rising', 'Reach level 5', lvl >= 5),
    a('level-10', '🌟', 'Itqan', 'Reach level 10', lvl >= 10),
    a('days-30', '🗓️', 'Regular', 'Use Itqan across 30 days', daysUsed >= 30),
    a('memories-10', '📸', 'Storyteller', 'Save 10 memories', memories >= 10),
    a('ideas-25', '💡', 'Idea machine', 'Capture 25 ideas', ideas.length >= 25),
    a('idea-done', '🚀', 'From idea to reality', 'See an idea through to done', ideas.some((i) => i.status === 'done')),
  ]
}
