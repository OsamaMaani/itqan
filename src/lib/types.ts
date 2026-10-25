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
  /** Progress read from Training instead of check-ins (ADR-027). null = check-ins as usual. Schema v8. */
  link: GoalLink | null
}

/** What an exercise goal follows: heaviest weight, most reps, longest time or farthest distance. */
export const GOAL_METRICS = ['kg', 'reps', 'seconds', 'meters'] as const
export type GoalMetric = (typeof GOAL_METRICS)[number]

/** A numeric goal that follows Training: an exercise's best, or a count of finished workouts. */
export type GoalLink =
  | { kind: 'exercise'; exerciseId: ID; metric: GoalMetric }
  | { kind: 'workouts' }

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
  /** The habit this session was for (ADR-029). Schema v10. */
  habitId: ID | null
  /** What finishing it added to that habit's log on the session's day — taken back exactly on delete. */
  habitAmount: number
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
  habitId: ID | null
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

/** One line of a note's checklist (schema v13). */
export interface NoteItem {
  id: ID
  text: string
  done: boolean
  /** The task made from this line, if any. Stale ids are ignored on read. */
  taskId: ID | null
}

/**
 * A note (ADR-035, schema v13): Keep-style — a title, free text and/or a checklist, a colour and
 * labels, optionally about an area, a project or a goal. Archived notes are kept, just out of sight.
 */
export interface Note {
  id: ID
  title: string
  body: string
  items: NoteItem[]
  /** A tint for the card from the area palette; null = plain */
  color: AreaColor | null
  /** Free labels, stored without "#" */
  labels: string[]
  /** Kept at the top of the Notes screen */
  pinned: boolean
  /** Shown on Today, the home screen (schema v14). Separate from `pinned`: many notes may sit at the top of Notes, a few on Today. */
  onToday: boolean
  archived: boolean
  areaId: ID | null
  projectId: ID | null
  goalId: ID | null
  /** Tasks made from the whole note. Stale ids are ignored on read. */
  taskIds: ID[]
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

// --- Training (ADR-027, memory/11-training.md; schema v8) ----------------------------------------
// Weights are kg, distances metres, durations seconds — always; lb is only a display choice.

export const EQUIPMENT = ['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'kettlebell', 'band', 'other'] as const
export type Equipment = (typeof EQUIPMENT)[number]

/** weight = reps × kg; reps = reps, optionally with added kg; time = seconds; distance = metres in seconds. */
export const MEASURES = ['weight', 'reps', 'time', 'distance'] as const
export type Measure = (typeof MEASURES)[number]

export const MUSCLES = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core', 'glutes', 'quads', 'hamstrings', 'calves', 'fullBody', 'cardio',
] as const
export type Muscle = (typeof MUSCLES)[number]

export interface Exercise {
  id: ID
  name: string
  equipment: Equipment
  measure: Measure
  muscle: Muscle | null
  /** "Seat at 4", "left cable station" */
  notes: string
  /** The step a "go heavier" suggestion adds, in kg */
  incrementKg: number
  /** Hidden from pickers; its history is kept */
  archived: boolean
  createdAt: string
  updatedAt: string
}

/** One exercise in a routine (or in a workout's snapshot of it), with its target. */
export interface RoutineItem {
  id: ID
  exerciseId: ID
  /** Work sets */
  sets: number
  /** Warm-up sets before them; never count toward PRs */
  warmupSets: number
  repsMin: number | null
  repsMax: number | null
  kg: number | null
  seconds: number | null
  meters: number | null
  /** Rest after each set */
  restSec: number
}

export interface Routine {
  id: ID
  name: string
  emoji: string
  items: RoutineItem[]
  notes: string
  archived: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export interface TrainingProgram {
  /** weekdays = fixed days; rotation = in order, whenever you go; flexible = no schedule, train when you can (schema v9) */
  mode: 'weekdays' | 'rotation' | 'flexible'
  /** Index = day of week, 0 Sunday … 6 Saturday; null = rest day */
  weekdays: (ID | null)[]
  /** Routines in order, for mode 'rotation' */
  rotation: ID[]
  /** Workouts a week aimed for (rotation, flexible); 0 = no aim (flexible only) */
  perWeek: number
  /** Finishing a workout ticks this habit on the workout's day */
  habitId: ID | null
  updatedAt: string
}

export interface Workout {
  id: ID
  routineId: ID | null
  /** The routine's name when the workout started (or what the person typed) */
  name: string
  /** The local day it started on — never changes (day-boundary rule) */
  date: DateKey
  startedAt: string
  /** null = still in progress */
  finishedAt: string | null
  /** The routine's items as they were at the start, plus anything added or reordered during it */
  items: RoutineItem[]
  note: string
  /** The habit finishing this workout ticked, so deleting it takes back exactly that tick */
  tickedHabitId: ID | null
  createdAt: string
  updatedAt: string
}

export const EFFORTS = ['easy', 'good', 'hard', 'failed'] as const
export type Effort = (typeof EFFORTS)[number]

/** One set. Its own collection, so sets logged on two devices at once both survive sync. */
export interface WorkoutSet {
  id: ID
  workoutId: ID
  /** The RoutineItem inside the workout's `items` this set belongs to */
  itemId: ID
  exerciseId: ID
  warmup: boolean
  reps: number | null
  kg: number | null
  seconds: number | null
  meters: number | null
  effort: Effort | null
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
  /** The daily card on Today (ADR-023). Synced across devices. */
  daily: DailySettings
  /** Interface language (ADR-024). Synced across devices. */
  language: UiLanguage
  /** How weights are shown (ADR-027). Stored weights are always kg. Synced. Schema v8. */
  weightUnit: WeightUnit
  /** What this device announces (ADR-031). Device-local, never synced. Schema v11. */
  notify: NotifySettings
}

/** Per-device notification choices (ADR-031). The browser's own permission is asked once, from Settings. */
export interface NotifySettings {
  /** Master switch: nothing is announced on this device when off. */
  on: boolean
  /** The end of a focus session or a break. */
  timer: boolean
  reminders: boolean
  /** A person's check-in falling due (ADR-018). */
  checkIns: boolean
}

/** The kinds of alert one device is pushed (ADR-033): the same kinds as its own NotifySettings. */
export type PushKinds = Pick<NotifySettings, 'timer' | 'reminders' | 'checkIns'>

/**
 * A device that asked to be pushed alerts from the laptop's helper (ADR-031) — the end of a focus
 * session or break started on the laptop, and reminders and check-ins (ADR-033). Created by that
 * device when it subscribes; synced, so the laptop learns of it; removing it is how the device
 * stops them. Holds everything needed to send it one Web Push: the subscription and the device's
 * own VAPID key pair. Schema v11.
 */
export interface PushTarget {
  id: ID
  /** "iPhone", "Android"… — a name for the list in Settings, from the device type. */
  label: string
  /** The push service URL from the subscription (https://web.push.apple.com/… on an iPhone). */
  endpoint: string
  /** The subscription's keys, base64url: the device's P-256 public key and auth secret (RFC 8291). */
  p256dh: string
  auth: string
  /** The VAPID key pair the device subscribed with (RFC 8292): public as base64url raw point, private as JWK. */
  vapidPublic: string
  vapidPrivate: JsonWebKey
  /** The contact the sender names in the VAPID token — the app's https address on that device. */
  subject: string
  /**
   * Which alerts this device wants pushed — its own notification choices, which are device-local,
   * carried to the laptop here (ADR-033). Schema v12.
   */
  kinds: PushKinds
  createdAt: string
  updatedAt: string
}

export type WeightUnit = 'kg' | 'lb'

export const UI_LANGUAGES = ['en', 'ar', 'fr', 'zh', 'es'] as const
export type UiLanguage = (typeof UI_LANGUAGES)[number]

export const WORD_LANGUAGES = ['fr', 'en', 'de', 'es', 'zh'] as const
export type WordLanguage = (typeof WORD_LANGUAGES)[number]
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type CefrLevel = (typeof CEFR_LEVELS)[number]

export interface DailySettings {
  verse: boolean
  hadith: boolean
  word: boolean
  wisdom: boolean
  fact: boolean
  /** The English meaning under the Arabic of a verse or hadith. */
  meaning: boolean
  wordLanguage: WordLanguage
  wordLevel: CefrLevel
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
  notes: Note[]
  reminders: Reminder[]
  exercises: Exercise[]
  routines: Routine[]
  /** null until the program is first saved (ADR-027) */
  program: TrainingProgram | null
  workouts: Workout[]
  workoutSets: WorkoutSet[]
  /** Devices that get the laptop's alerts pushed to them (ADR-031). */
  pushTargets: PushTarget[]
  settings: Settings
}
