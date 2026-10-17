import { tx, type I18n } from '../i18n/core'
import { addDaysKey } from './date'
import { uid } from './id'
import type { Area, Data, Goal, Habit, Settings, Task } from './types'

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'system',
  weekStartsOn: 6,
  sound: true,
  focusMinutes: 25,
  breakMinutes: 5,
  showHijri: true,
  lastBackupAt: null,
  onboarded: false,
  daily: { verse: true, hadith: true, word: true, wisdom: true, fact: true, meaning: true, wordLanguage: 'fr', wordLevel: 'B1' },
  language: 'en',
}

export function emptyData(): Data {
  return {
    areas: [], tasks: [], habits: [], habitLogs: {}, goals: [], goalLogs: [],
    focusSessions: [], timer: null, dayNotes: {}, reviews: {}, memories: [], ideas: [], reminders: [], projects: [], projectUpdates: [], contacts: [], interactions: [], achievements: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

/** The starter set: the routine Itqan was first built around (memory/00-project.md). */
export function starterData(today: string, t: I18n = tx()): Pick<Data, 'areas' | 'habits' | 'goals' | 'tasks'> {
  const now = new Date().toISOString()
  // Created in the interface language at the moment of onboarding; afterwards it is the owner's data.
  const s = t.m.seed
  const area = (name: string, emoji: string, color: Area['color']): Area =>
    ({ id: uid(), name, emoji, color, archived: false, createdAt: now })

  const quran = area(s.areas.quran, '📖', 'emerald')
  const french = area(s.areas.french, '🇫🇷', 'sky')
  const gym = area(s.areas.gym, '🏋️', 'rose')
  const books = area(s.areas.books, '📚', 'amber')
  const courses = area(s.areas.courses, '🎓', 'indigo')
  const life = area(s.areas.life, '🌱', 'lime')

  let order = 0
  const habit = (name: string, emoji: string, a: Area, schedule: Habit['schedule'], target = 1, unit = ''): Habit =>
    ({ id: uid(), name, emoji, areaId: a.id, schedule, target, unit, archived: false, createdAt: now, order: order++ })

  const habits: Habit[] = [
    habit(s.habits.quran, '📖', quran, { type: 'daily' }),
    habit(s.habits.french, '🗣️', french, { type: 'daily' }, 20, s.units.min),
    habit(s.habits.read, '📚', books, { type: 'daily' }, 10, s.units.pages),
    habit(s.habits.gym, '🏋️', gym, { type: 'weekly', times: 4 }),
    habit(s.habits.course, '🎓', courses, { type: 'weekly', times: 5 }),
  ]

  const goal = (g: Partial<Goal> & Pick<Goal, 'title' | 'kind'>): Goal => ({
    id: uid(), why: '', areaId: null, startValue: 0, target: 0, unit: '', startDate: today,
    deadline: null, milestones: [], status: 'active', completedAt: null, createdAt: now, ...g,
  })
  const ms = (...titles: string[]) => titles.map((title) => ({ id: uid(), title, done: false, doneAt: null }))

  const goals: Goal[] = [
    goal({
      title: s.goals.quran.title, kind: 'numeric', areaId: quran.id, target: 30, unit: s.units.juz,
      deadline: addDaysKey(today, 120), why: s.goals.quran.why,
    }),
    goal({
      title: s.goals.french.title, kind: 'milestones', areaId: french.id, deadline: addDaysKey(today, 180),
      why: s.goals.french.why,
      milestones: ms(...s.goals.french.milestones),
    }),
    goal({
      title: s.goals.book.title, kind: 'numeric', areaId: books.id, target: 300, unit: s.units.pages,
      deadline: addDaysKey(today, 30), why: s.goals.book.why,
    }),
    goal({
      title: s.goals.course.title, kind: 'numeric', areaId: courses.id, target: 10, unit: s.units.modules,
      deadline: addDaysKey(today, 45), why: s.goals.course.why,
    }),
  ]

  const task = (title: string, a: Area | null, extra: Partial<Task> = {}): Task => ({
    id: uid(), title, notes: '', areaId: a?.id ?? null, goalId: null, projectId: null, date: today, timeOfDay: 'anytime',
    priority: 0, estimateMin: null, subtasks: [], done: false, doneAt: null, stage: 'todo', blocked: false, createdAt: now, order: order++, ...extra,
  })

  const tasks: Task[] = [
    task(s.tasks.tour, life, { priority: 1, timeOfDay: 'morning' }),
    task(s.tasks.editGoals, life, { priority: 2 }),
    task(s.tasks.focus, courses, { timeOfDay: 'afternoon', estimateMin: 25 }),
    task(s.tasks.gym, gym, { timeOfDay: 'evening' }),
  ]

  return { areas: [quran, french, gym, books, courses, life], habits, goals, tasks }
}
