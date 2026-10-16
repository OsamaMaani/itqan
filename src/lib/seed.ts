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
}

export function emptyData(): Data {
  return {
    areas: [], tasks: [], habits: [], habitLogs: {}, goals: [], goalLogs: [],
    focusSessions: [], timer: null, dayNotes: {}, reviews: {}, memories: [], ideas: [], reminders: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

/** The starter set: the routine Itqan was first built around (memory/00-project.md). */
export function starterData(today: string): Pick<Data, 'areas' | 'habits' | 'goals' | 'tasks'> {
  const now = new Date().toISOString()
  const area = (name: string, emoji: string, color: Area['color']): Area =>
    ({ id: uid(), name, emoji, color, archived: false, createdAt: now })

  const quran = area('Quran', '📖', 'emerald')
  const french = area('French', '🇫🇷', 'sky')
  const gym = area('Gym', '🏋️', 'rose')
  const books = area('Books', '📚', 'amber')
  const courses = area('Courses', '🎓', 'indigo')
  const life = area('Life', '🌱', 'lime')

  let order = 0
  const habit = (name: string, emoji: string, a: Area, schedule: Habit['schedule'], target = 1, unit = ''): Habit =>
    ({ id: uid(), name, emoji, areaId: a.id, schedule, target, unit, archived: false, createdAt: now, order: order++ })

  const habits: Habit[] = [
    habit('Revise Quran', '📖', quran, { type: 'daily' }),
    habit('French practice', '🗣️', french, { type: 'daily' }, 20, 'min'),
    habit('Read', '📚', books, { type: 'daily' }, 10, 'pages'),
    habit('Gym', '🏋️', gym, { type: 'weekly', times: 4 }),
    habit('Course study', '🎓', courses, { type: 'weekly', times: 5 }),
  ]

  const goal = (g: Partial<Goal> & Pick<Goal, 'title' | 'kind'>): Goal => ({
    id: uid(), why: '', areaId: null, startValue: 0, target: 0, unit: '', startDate: today,
    deadline: null, milestones: [], status: 'active', completedAt: null, createdAt: now, ...g,
  })
  const ms = (...titles: string[]) => titles.map((title) => ({ id: uid(), title, done: false, doneAt: null }))

  const goals: Goal[] = [
    goal({
      title: 'Complete a full Quran revision', kind: 'numeric', areaId: quran.id, target: 30, unit: 'juz',
      deadline: addDaysKey(today, 120), why: 'Keep what I memorised strong and close to my heart.',
    }),
    goal({
      title: 'Reach French B1', kind: 'milestones', areaId: french.id, deadline: addDaysKey(today, 180),
      why: 'Speak with confidence, not just pass an exam.',
      milestones: ms('Finish A2 grammar review', 'Learn 1,000 core words', 'Give 5 oral presentations', 'Pass a B1 mock exam'),
    }),
    goal({
      title: 'Finish my current book', kind: 'numeric', areaId: books.id, target: 300, unit: 'pages',
      deadline: addDaysKey(today, 30), why: 'Edit the title and page count to match the book.',
    }),
    goal({
      title: 'Finish my current course', kind: 'numeric', areaId: courses.id, target: 10, unit: 'modules',
      deadline: addDaysKey(today, 45), why: 'Edit to match the course you are studying.',
    }),
  ]

  const task = (title: string, a: Area | null, extra: Partial<Task> = {}): Task => ({
    id: uid(), title, notes: '', areaId: a?.id ?? null, goalId: null, date: today, timeOfDay: 'anytime',
    priority: 0, estimateMin: null, subtasks: [], done: false, doneAt: null, createdAt: now, order: order++, ...extra,
  })

  const tasks: Task[] = [
    task('Tour Itqan: press Ctrl+K (or the + button) to add a task', life, { priority: 1, timeOfDay: 'morning' }),
    task('Edit the starter goals so they match your real books, courses and targets', life, { priority: 2 }),
    task('Try one 25-minute focus session', courses, { timeOfDay: 'afternoon', estimateMin: 25 }),
    task('Gym session', gym, { timeOfDay: 'evening' }),
  ]

  return { areas: [quran, french, gym, books, courses, life], habits, goals, tasks }
}
