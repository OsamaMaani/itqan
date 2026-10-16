/**
 * The whole data model. Every persisted shape lives here so that a schema change is one
 * diff in one file — and needs a migration in `store.ts` (see memory/07-data-model.md).
 *
 * Dates that mean "a day" are DateKeys ("2026-10-16", local time). Instants are ISO strings.
 */

export type DateKey = string
export type ID = string

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime'
export type Priority = 0 | 1 | 2 | 3 // 0 none, 3 highest

export interface Area {
  id: ID
  name: string
  emoji: string
  color: AreaColor
  archived: boolean
  createdAt: string
}

export const AREA_COLORS = [
  'emerald', 'teal', 'sky', 'indigo', 'violet', 'rose', 'amber', 'orange', 'lime', 'slate',
] as const
export type AreaColor = (typeof AREA_COLORS)[number]

export interface Subtask {
  id: ID
  title: string
  done: boolean
}

export interface Task {
  id: ID
  title: string
  notes: string
  areaId: ID | null
  goalId: ID | null
  /** The project this task belongs to (schema v3). */
  projectId: ID | null
  /** null = Inbox (not scheduled yet) */
  date: DateKey | null
  timeOfDay: TimeOfDay
  priority: Priority
  estimateMin: number | null
  subtasks: Subtask[]
  done: boolean
  doneAt: string | null
  /** Board column while not done (schema v4). `done` stays the single source of truth for done. */
  stage: TaskStage
  /** Waiting on something; shown in red on boards and lists (schema v4). */
  blocked: boolean
  createdAt: string
  order: number
}

export type TaskStage = 'todo' | 'doing'

export type HabitSchedule =
  | { type: 'daily' }
  | { type: 'days'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { type: 'weekly'; times: number } // N times per week, any days

export interface Habit {
  id: ID
  name: string
  emoji: string
  areaId: ID | null
  schedule: HabitSchedule
  /** completions per scheduled day needed to count the day as met (e.g. 1, or 20 pages) */
  target: number
  unit: string
  archived: boolean
  createdAt: string
  order: number
}

/** habitId -> dateKey -> amount logged that day */
export type HabitLogs = Record<ID, Record<DateKey, number>>

export interface Milestone {
  id: ID
  title: string
  done: boolean
  doneAt: string | null
}

export interface Goal {
  id: ID
  title: string
  why: string
  areaId: ID | null
  /** numeric: progress toward a target number. milestones: a checklist. */
  kind: 'numeric' | 'milestones'
  startValue: number
  target: number
  unit: string
  startDate: DateKey
  deadline: DateKey | null
  milestones: Milestone[]
  status: 'active' | 'paused' | 'done'
  completedAt: string | null
  createdAt: string
}

export interface GoalLog {
  id: ID
  goalId: ID
  date: DateKey
  amount: number
  note: string
  createdAt: string
}

export interface FocusSession {
  id: ID
  startedAt: string
  minutes: number
  label: string
  areaId: ID | null
  goalId: ID | null
  taskId: ID | null
}

export interface ActiveTimer {
  mode: 'focus' | 'break'
  /** epoch ms when the timer ends; null when paused */
  endsAt: number | null
  /** remaining ms while paused */
  remainingMs: number
  totalMs: number
  startedAt: string
  label: string
  areaId: ID | null
  goalId: ID | null
  taskId: ID | null
}

export interface DayNote {
  intention: string
  mood: 0 | 1 | 2 | 3 | 4 | 5 // 0 = not set
  reflection: string
}

export interface WeeklyReview {
  /** DateKey of the first day of that week */
  weekStart: DateKey
  wins: string
  struggles: string
  nextFocus: string
  rating: 0 | 1 | 2 | 3 | 4 | 5
  savedAt: string
}

export interface Memory {
  id: ID
  title: string
  story: string
  /** The day it happened (may be long before it was written down). */
  date: DateKey
  emoji: string
  tags: string[]
  favorite: boolean
  createdAt: string
}

export const IDEA_STATUSES = ['new', 'exploring', 'doing', 'done', 'dropped'] as const
export type IdeaStatus = (typeof IDEA_STATUSES)[number]

export interface Idea {
  id: ID
  title: string
  notes: string
  areaId: ID | null
  status: IdeaStatus
  /** Tasks created from this idea ("make actions on it"). Stale ids are ignored on read. */
  taskIds: ID[]
  goalId: ID | null
  createdAt: string
  updatedAt: string
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Reminder {
  id: ID
  title: string
  notes: string
  emoji: string
  /** First (or only) occurrence. For yearly dates like birthdays, the real original date. */
  date: DateKey
  /** "HH:mm", or null for an all-day date (alerts at REMINDER_ALL_DAY_TIME). */
  time: string | null
  repeat: ReminderRepeat
  /** Minutes before each occurrence to alert: 0 = at the time, 1440 = a day before… */
  alerts: number[]
  /** Important reminders stay on screen until dismissed. */
  important: boolean
  /** The person this reminder is about (schema v3). */
  contactId: ID | null
  /** Yearly reminders: show "N years" (false for a birthday saved without its year). */
  countYears: boolean
  /** Only for repeat 'none': handled, so no more alerts. */
  done: boolean
  createdAt: string
}

export const PROJECT_STATUSES = ['planning', 'active', 'on-hold', 'done', 'archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface ProjectLink {
  id: ID
  label: string
  url: string
}

export interface Project {
  id: ID
  title: string
  emoji: string
  description: string
  areaId: ID | null
  goalId: ID | null
  status: ProjectStatus
  startDate: DateKey | null
  dueDate: DateKey | null
  notes: string
  links: ProjectLink[]
  /** Where progress comes from: the project's tasks, or a number set by hand (schema v4). */
  progressMode: 'tasks' | 'manual'
  /** 0–100, used when progressMode is 'manual' */
  manualProgress: number
  view: 'list' | 'board'
  /** Show on Today */
  pinned: boolean
  createdAt: string
  updatedAt: string
}

/** A short status note on a project, optionally recording a new manual progress (schema v4). */
export interface ProjectUpdate {
  id: ID
  projectId: ID
  date: DateKey
  text: string
  /** The manual progress set with this update, 0–100 */
  progress: number | null
  createdAt: string
}

/** A real-life accomplishment (schema v5). Not the game badges in gamification.ts. */
export interface Achievement {
  id: ID
  title: string
  story: string
  date: DateKey
  /** A preset key from ACHIEVEMENT_CATEGORIES, or a custom label */
  category: string
  emoji: string
  /** 1 small · 2 notable · 3 major */
  impact: 1 | 2 | 3
  highlight: boolean
  tags: string[]
  links: ProjectLink[]
  goalId: ID | null
  projectId: ID | null
  /** What suggested it ("goal:<id>", "project:<id>", "streak:<habitId>:30", "focus:100"), so it is never suggested twice */
  source: string | null
  createdAt: string
  updatedAt: string
}

export const CIRCLES = ['family', 'friend', 'university', 'work', 'mentor', 'other'] as const
export type Circle = (typeof CIRCLES)[number]

export interface Contact {
  id: ID
  name: string
  emoji: string
  circle: Circle
  tags: string[]
  phone: string
  email: string
  /** WhatsApp, LinkedIn, Instagram… any profile link */
  link: string
  company: string
  role: string
  howWeMet: string
  /** "MM-DD" or "YYYY-MM-DD" (year optional) */
  birthday: string
  notes: string
  /** Check in every N days; null = no rhythm */
  cadenceDays: number | null
  /** "Last time we talked", entered by hand before any check-in was logged */
  lastContactManual: DateKey | null
  /** Check-in pushed back until this day */
  snoozedUntil: DateKey | null
  /** The yearly reminder created for this person's birthday, if any */
  birthdayReminderId: ID | null
  favorite: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
}

export type InteractionKind = 'call' | 'message' | 'meet' | 'email' | 'other'

export interface Interaction {
  id: ID
  contactId: ID
  date: DateKey
  kind: InteractionKind
  note: string
  createdAt: string
}

export interface Settings {
  name: string
  theme: 'system' | 'light' | 'dark'
  /** 0 = Sunday … 6 = Saturday */
  weekStartsOn: 0 | 1 | 6
  sound: boolean
  focusMinutes: number
  breakMinutes: number
  showHijri: boolean
  lastBackupAt: string | null
  onboarded: boolean
}

export interface Data {
  areas: Area[]
  tasks: Task[]
  habits: Habit[]
  habitLogs: HabitLogs
  goals: Goal[]
  goalLogs: GoalLog[]
  focusSessions: FocusSession[]
  timer: ActiveTimer | null
  dayNotes: Record<DateKey, DayNote>
  reviews: Record<DateKey, WeeklyReview>
  memories: Memory[]
  projects: Project[]
  projectUpdates: ProjectUpdate[]
  contacts: Contact[]
  interactions: Interaction[]
  achievements: Achievement[]
  ideas: Idea[]
  reminders: Reminder[]
  settings: Settings
}
