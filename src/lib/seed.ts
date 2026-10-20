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
  weightUnit: 'kg',
}

export function emptyData(): Data {
  return {
    areas: [], tasks: [], habits: [], habitLogs: {}, goals: [], goalLogs: [],
    focusSessions: [], timer: null, dayNotes: {}, reviews: {}, memories: [], ideas: [], reminders: [], projects: [], projectUpdates: [], contacts: [], interactions: [], achievements: [],
    exercises: [], routines: [], program: null, workouts: [], workoutSets: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

/**
 * The starter set: a generic example offered at onboarding so a new user sees every kind of thing
 * Itqan holds (ADR-025). Deliberately not anyone's real routine — this repository is public.
 */
export function starterData(today: string, t: I18n = tx()): Pick<Data, 'areas' | 'habits' | 'goals' | 'tasks'> {
  const now = new Date().toISOString()
  // Created in the interface language at the moment of onboarding; afterwards it is the owner's data.
  const s = t.m.seed
  const area = (name: string, emoji: string, color: Area['color']): Area =>
    ({ id: uid(), name, emoji, color, archived: false, createdAt: now })

  const health = area(s.areas.health, '💪', 'rose')
  const mind = area(s.areas.mind, '🧘', 'emerald')
  const learning = area(s.areas.learning, '🎓', 'indigo')
  const books = area(s.areas.books, '📚', 'amber')
  const work = area(s.areas.work, '💼', 'sky')
  const life = area(s.areas.life, '🌱', 'lime')

  let order = 0
  const habit = (name: string, emoji: string, a: Area, schedule: Habit['schedule'], target = 1, unit = ''): Habit =>
    ({ id: uid(), name, emoji, areaId: a.id, schedule, target, unit, archived: false, createdAt: now, order: order++ })

  const habits: Habit[] = [
    habit(s.habits.water, '💧', health, { type: 'daily' }, 8, s.units.glasses),
    habit(s.habits.read, '📚', books, { type: 'daily' }, 10, s.units.pages),
    habit(s.habits.meditate, '🧘', mind, { type: 'daily' }, 10, s.units.min),
    habit(s.habits.exercise, '🏃', health, { type: 'weekly', times: 3 }),
    habit(s.habits.learn, '🎓', learning, { type: 'weekly', times: 5 }),
  ]

  const goal = (g: Partial<Goal> & Pick<Goal, 'title' | 'kind'>): Goal => ({
    id: uid(), why: '', areaId: null, startValue: 0, target: 0, unit: '', startDate: today,
    deadline: null, milestones: [], status: 'active', completedAt: null, createdAt: now, link: null, ...g,
  })
  const ms = (...titles: string[]) => titles.map((title) => ({ id: uid(), title, done: false, doneAt: null }))

  const goals: Goal[] = [
    goal({
      title: s.goals.books.title, kind: 'numeric', areaId: books.id, target: 12, unit: s.units.books,
      deadline: addDaysKey(today, 365), why: s.goals.books.why,
    }),
    goal({
      title: s.goals.run.title, kind: 'milestones', areaId: health.id, deadline: addDaysKey(today, 90),
      why: s.goals.run.why,
      milestones: ms(...s.goals.run.milestones),
    }),
    goal({
      title: s.goals.skill.title, kind: 'milestones', areaId: learning.id, deadline: addDaysKey(today, 180),
      why: s.goals.skill.why,
      milestones: ms(...s.goals.skill.milestones),
    }),
    goal({
      title: s.goals.course.title, kind: 'numeric', areaId: learning.id, target: 10, unit: s.units.modules,
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
    task(s.tasks.focus, work, { timeOfDay: 'afternoon', estimateMin: 25 }),
    task(s.tasks.walk, health, { timeOfDay: 'evening', estimateMin: 20 }),
  ]

  return { areas: [health, mind, learning, books, work, life], habits, goals, tasks }
}
