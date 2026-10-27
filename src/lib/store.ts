import { tx } from '../i18n/core'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { goalProgress } from './goals'
import { focusHabitAmount } from './habits'
import { uid } from './id'
import { migrate, SCHEMA_VERSION } from './migrations'
import { emptyData, starterData } from './seed'
import { setDayRule, todayKey } from './date'
import { deviceZone, resolveFajr, switchFajr } from './fajr'
import type {
  Achievement, ActiveTimer, Area, Contact, Data, DateKey, DayNote, Exercise, FajrSettings, Goal, Habit, ID, Idea, IdeaStatus, InteractionKind, Memory, Note,
  Project, ProjectUpdate, PushTarget, Reminder, Routine, RoutineItem, Settings, Task, TaskStage, TrainingProgram, WeeklyReview, Workout, WorkoutSet,
} from './types'
import { birthdayReminderDate } from './connections'

/**
 * The single store. Every write goes through an action here — components never build
 * new state themselves — so persistence, migrations and derived rules (like a goal
 * completing when it reaches its target) live in one place. See memory/01-architecture.md.
 */

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt' | 'done' | 'doneAt'>> & { title: string }

interface Actions {
  // areas
  addArea: (a: Pick<Area, 'name' | 'emoji' | 'color'>) => ID
  updateArea: (id: ID, patch: Partial<Area>) => void
  deleteArea: (id: ID) => void
  // tasks
  addTask: (t: NewTask) => ID
  updateTask: (id: ID, patch: Partial<Task>) => void
  toggleTask: (id: ID) => boolean
  deleteTask: (id: ID) => Task | undefined
  restoreTask: (t: Task) => void
  moveTask: (id: ID, date: DateKey | null) => void
  toggleSubtask: (taskId: ID, subId: ID) => void
  /** Moves a task between board columns; 'done' completes it. Returns true when it became done. */
  setTaskStage: (id: ID, stage: TaskStage | 'done') => boolean
  toggleTaskBlocked: (id: ID) => void
  // habits
  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'order' | 'archived' | 'round'> & { round?: Habit['round'] }) => ID
  updateHabit: (id: ID, patch: Partial<Habit>) => void
  deleteHabit: (id: ID) => void
  setHabitAmount: (id: ID, day: DateKey, amount: number) => void
  // goals
  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'status' | 'completedAt' | 'link'> & Partial<Pick<Goal, 'link'>>) => ID
  updateGoal: (id: ID, patch: Partial<Goal>) => void
  deleteGoal: (id: ID) => void
  /** returns true when this log completed the goal */
  logGoal: (goalId: ID, amount: number, note?: string, date?: DateKey) => boolean
  deleteGoalLog: (logId: ID) => void
  /** returns true when this toggle completed the goal */
  toggleMilestone: (goalId: ID, milestoneId: ID) => boolean
  setGoalStatus: (id: ID, status: Goal['status']) => void
  // focus
  startTimer: (t: Omit<ActiveTimer, 'endsAt' | 'remainingMs' | 'startedAt'>) => void
  pauseTimer: () => void
  resumeTimer: () => void
  /** Ends the timer. Saves a focus session when `save` and in focus mode. */
  finishTimer: (save: boolean) => number
  deleteFocusSession: (id: ID) => void
  // notes & reviews
  setDayNote: (day: DateKey, patch: Partial<DayNote>) => void
  saveReview: (r: Omit<WeeklyReview, 'savedAt'>) => void
  // memories
  addMemory: (m: Omit<Memory, 'id' | 'createdAt'>) => ID
  updateMemory: (id: ID, patch: Partial<Memory>) => void
  deleteMemory: (id: ID) => Memory | undefined
  restoreMemory: (m: Memory) => void
  // ideas
  addIdea: (i: Pick<Idea, 'title'> & Partial<Pick<Idea, 'notes' | 'areaId' | 'status'>>) => ID
  updateIdea: (id: ID, patch: Partial<Idea>) => void
  setIdeaStatus: (id: ID, status: IdeaStatus) => void
  deleteIdea: (id: ID) => Idea | undefined
  restoreIdea: (i: Idea) => void
  /** Creates a task from an idea and links it; a new idea moves to "doing". */
  ideaToTask: (ideaId: ID, title: string, date: DateKey | null) => ID
  linkIdeaGoal: (ideaId: ID, goalId: ID) => void
  // notes (ADR-035)
  addNote: (n: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'taskIds'>>) => ID
  updateNote: (id: ID, patch: Partial<Omit<Note, 'id' | 'createdAt'>>) => void
  deleteNote: (id: ID) => Note | undefined
  restoreNote: (n: Note) => void
  toggleNoteItem: (noteId: ID, itemId: ID) => void
  /** Creates a task from the whole note, or from one checklist line when `itemId` is given, and links it. */
  noteToTask: (noteId: ID, title: string, date: DateKey | null, itemId?: ID) => ID
  // reminders
  addReminder: (r: Omit<Reminder, 'id' | 'createdAt' | 'done' | 'contactId' | 'countYears'> & Partial<Pick<Reminder, 'contactId' | 'countYears'>>) => ID
  updateReminder: (id: ID, patch: Partial<Reminder>) => void
  deleteReminder: (id: ID) => Reminder | undefined
  restoreReminder: (r: Reminder) => void
  // projects
  addProject: (p: Pick<Project, 'title'> & Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => ID
  updateProject: (id: ID, patch: Partial<Project>) => void
  /** Deletes the project and its updates; its tasks are kept, just without a project. */
  deleteProject: (id: ID) => void
  /** Sets manual progress (0–100) and switches the project to manual progress. */
  setProjectProgress: (id: ID, percent: number) => void
  addProjectUpdate: (u: Pick<ProjectUpdate, 'projectId' | 'text' | 'progress'> & { date?: DateKey }) => ID
  deleteProjectUpdate: (id: ID) => void
  /** An idea becomes a project: the idea moves to "doing" and links nothing else. */
  ideaToProject: (ideaId: ID) => ID
  // connections
  addContact: (c: Pick<Contact, 'name'> & Partial<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>) => ID
  updateContact: (id: ID, patch: Partial<Contact>) => void
  /** Deletes the person, their check-in history and their birthday reminder; other reminders about them are kept. */
  deleteContact: (id: ID) => void
  logInteraction: (contactId: ID, kind: InteractionKind, note: string, date: DateKey) => ID
  deleteInteraction: (id: ID) => void
  snoozeContact: (id: ID, until: DateKey | null) => void
  /** Creates, updates or removes the yearly birthday reminder for this person. */
  syncBirthdayReminder: (contactId: ID, wanted: boolean) => void
  // achievements
  addAchievement: (a: Pick<Achievement, 'title'> & Partial<Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>>) => ID
  updateAchievement: (id: ID, patch: Partial<Achievement>) => void
  deleteAchievement: (id: ID) => Achievement | undefined
  restoreAchievement: (a: Achievement) => void
  // training (ADR-027)
  addExercise: (e: Pick<Exercise, 'name'> & Partial<Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>>) => ID
  updateExercise: (id: ID, patch: Partial<Exercise>) => void
  /** Archives an exercise that has history (kept for history); deletes one that has none. */
  deleteExercise: (id: ID) => 'archived' | 'deleted'
  addRoutine: (r: Pick<Routine, 'name'> & Partial<Omit<Routine, 'id' | 'createdAt' | 'updatedAt' | 'order'>>) => ID
  updateRoutine: (id: ID, patch: Partial<Routine>) => void
  /** Removes the routine and takes it out of the program; past workouts keep their copy. */
  deleteRoutine: (id: ID) => void
  /** Creates the program on first use. */
  updateProgram: (patch: Partial<Omit<TrainingProgram, 'updatedAt'>>) => void
  /** Starts a workout on today's local day, copying the routine's items. */
  startWorkout: (routineId: ID | null, name: string) => ID
  updateWorkout: (id: ID, patch: Partial<Pick<Workout, 'name' | 'note' | 'items'>>) => void
  addWorkoutItem: (workoutId: ID, item: Pick<RoutineItem, 'exerciseId'> & Partial<Omit<RoutineItem, 'id'>>) => ID
  logSet: (s: Omit<WorkoutSet, 'id' | 'createdAt'>) => ID
  updateSet: (id: ID, patch: Partial<Omit<WorkoutSet, 'id' | 'workoutId' | 'createdAt'>>) => void
  deleteSet: (id: ID) => void
  /** Finishes once: ticks the program's habit on the workout's day and completes linked goals. */
  finishWorkout: (id: ID) => void
  /** Deletes the workout and its sets, and takes back the habit tick it gave. */
  deleteWorkout: (id: ID) => void
  // notifications (ADR-031)
  /** Adds this device's push registration, or replaces it (same id) when the subscription changed. */
  savePushTarget: (t: PushTarget) => void
  removePushTarget: (id: ID) => void
  // settings & data
  updateSettings: (patch: Partial<Settings>) => void
  /**
   * Turns "a day starts at Fajr" on or off and/or changes its place, angle or notice (ADR-041).
   * Dated through FajrSpans, so nothing already done changes day. Returns whether it is on after:
   * asking for on where no place is known leaves it off.
   */
  setDayStart: (on: boolean, patch?: Partial<FajrSettings>) => boolean
  completeOnboarding: (name: string, starter: boolean) => void
  replaceAll: (d: Data) => void
  resetAll: () => void
}

export type Store = Data & Actions

const now = () => new Date().toISOString()

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyData(),

      // --- areas -----------------------------------------------------------------
      addArea: (a) => {
        const id = uid()
        set((s) => ({ areas: [...s.areas, { ...a, id, archived: false, createdAt: now() }] }))
        return id
      },
      updateArea: (id, patch) =>
        set((s) => ({ areas: s.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteArea: (id) =>
        set((s) => ({
          areas: s.areas.filter((a) => a.id !== id),
          tasks: s.tasks.map((t) => (t.areaId === id ? { ...t, areaId: null } : t)),
          habits: s.habits.map((h) => (h.areaId === id ? { ...h, areaId: null } : h)),
          goals: s.goals.map((g) => (g.areaId === id ? { ...g, areaId: null } : g)),
          focusSessions: s.focusSessions.map((f) => (f.areaId === id ? { ...f, areaId: null } : f)),
          ideas: s.ideas.map((i) => (i.areaId === id ? { ...i, areaId: null } : i)),
          notes: s.notes.map((n) => (n.areaId === id ? { ...n, areaId: null } : n)),
          projects: s.projects.map((p) => (p.areaId === id ? { ...p, areaId: null } : p)),
        })),

      // --- tasks -----------------------------------------------------------------
      addTask: (t) => {
        const id = uid()
        const task: Task = {
          notes: '', areaId: null, goalId: null, projectId: null, date: todayKey(), timeOfDay: 'anytime', priority: 0,
          estimateMin: null, subtasks: [], stage: 'todo', blocked: false, order: Date.now(), ...t,
          id, done: false, doneAt: null, createdAt: now(),
        }
        set((s) => ({ tasks: [...s.tasks, task] }))
        return id
      },
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      toggleTask: (id) => {
        const t = get().tasks.find((x) => x.id === id)
        if (!t) return false
        const done = !t.done
        set((s) => ({
          tasks: s.tasks.map((x) =>
            x.id === id
              ? { ...x, done, doneAt: done ? now() : null, date: done && x.date === null ? todayKey() : x.date }
              : x,
          ),
        }))
        return done
      },
      deleteTask: (id) => {
        const t = get().tasks.find((x) => x.id === id)
        set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }))
        return t
      },
      restoreTask: (t) => set((s) => ({ tasks: [...s.tasks, t] })),
      setTaskStage: (id, stage) => {
        const t = get().tasks.find((x) => x.id === id)
        if (!t) return false
        const done = stage === 'done'
        set((s) => ({
          tasks: s.tasks.map((x) =>
            x.id === id
              ? {
                  ...x,
                  done,
                  doneAt: done ? (x.done ? x.doneAt : now()) : null,
                  stage: done ? x.stage : stage,
                  blocked: done ? false : x.blocked,
                }
              : x,
          ),
        }))
        return done && !t.done
      },
      toggleTaskBlocked: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, blocked: !t.blocked } : t)) })),
      moveTask: (id, date) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, date } : t)) })),
      toggleSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: t.subtasks.map((x) => (x.id === subId ? { ...x, done: !x.done } : x)) }
              : t,
          ),
        })),

      // --- habits ----------------------------------------------------------------
      addHabit: (h) => {
        const id = uid()
        set((s) => ({ habits: [...s.habits, { round: null, ...h, id, archived: false, createdAt: now(), order: s.habits.length }] }))
        return id
      },
      updateHabit: (id, patch) =>
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
      deleteHabit: (id) =>
        set((s) => {
          const habitLogs = { ...s.habitLogs }
          delete habitLogs[id]
          return {
            habits: s.habits.filter((h) => h.id !== id),
            habitLogs,
            focusSessions: s.focusSessions.map((f) => (f.habitId === id ? { ...f, habitId: null, habitAmount: 0 } : f)),
            timer: s.timer?.habitId === id ? { ...s.timer, habitId: null } : s.timer,
            program: s.program?.habitId === id ? { ...s.program, habitId: null, updatedAt: now() } : s.program,
          }
        }),
      setHabitAmount: (id, day, amount) =>
        set((s) => {
          const days = { ...(s.habitLogs[id] ?? {}) }
          if (amount <= 0) delete days[day]
          else days[day] = amount
          return { habitLogs: { ...s.habitLogs, [id]: days } }
        }),

      // --- goals -----------------------------------------------------------------
      addGoal: (g) => {
        const id = uid()
        set((s) => ({ goals: [...s.goals, { link: null, ...g, id, status: 'active', completedAt: null, createdAt: now() }] }))
        return id
      },
      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      deleteGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          goalLogs: s.goalLogs.filter((l) => l.goalId !== id),
          tasks: s.tasks.map((t) => (t.goalId === id ? { ...t, goalId: null } : t)),
          focusSessions: s.focusSessions.map((f) => (f.goalId === id ? { ...f, goalId: null } : f)),
          ideas: s.ideas.map((i) => (i.goalId === id ? { ...i, goalId: null } : i)),
          notes: s.notes.map((n) => (n.goalId === id ? { ...n, goalId: null } : n)),
          projects: s.projects.map((p) => (p.goalId === id ? { ...p, goalId: null } : p)),
          achievements: s.achievements.map((a) => (a.goalId === id ? { ...a, goalId: null } : a)),
        })),
      logGoal: (goalId, amount, note = '', date = todayKey()) => {
        const log = { id: uid(), goalId, amount, note, date, createdAt: now() }
        set((s) => ({ goalLogs: [...s.goalLogs, log] }))
        return completeIfReached(goalId)
      },
      deleteGoalLog: (logId) => set((s) => ({ goalLogs: s.goalLogs.filter((l) => l.id !== logId) })),
      toggleMilestone: (goalId, milestoneId) => {
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  milestones: g.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, done: !m.done, doneAt: m.done ? null : now() } : m,
                  ),
                }
              : g,
          ),
        }))
        return completeIfReached(goalId)
      },
      setGoalStatus: (id, status) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, status, completedAt: status === 'done' ? (g.completedAt ?? now()) : null } : g,
          ),
        })),

      // --- focus -----------------------------------------------------------------
      startTimer: (t) =>
        set({ timer: { ...t, endsAt: Date.now() + t.totalMs, remainingMs: t.totalMs, startedAt: now() } }),
      pauseTimer: () =>
        set((s) =>
          s.timer?.endsAt
            ? { timer: { ...s.timer, remainingMs: Math.max(0, s.timer.endsAt - Date.now()), endsAt: null } }
            : {},
        ),
      resumeTimer: () =>
        set((s) => (s.timer && !s.timer.endsAt ? { timer: { ...s.timer, endsAt: Date.now() + s.timer.remainingMs } } : {})),
      finishTimer: (save) => {
        const t = get().timer
        if (!t) return 0
        const remaining = t.endsAt ? Math.max(0, t.endsAt - Date.now()) : t.remainingMs
        const minutes = Math.round((t.totalMs - remaining) / 60000)
        if (save && t.mode === 'focus' && minutes >= 1) {
          // The habit is checked in on the day the session started — the same day it counts on everywhere else.
          const habit = t.habitId ? get().habits.find((h) => h.id === t.habitId) : undefined
          const habitAmount = habit ? focusHabitAmount(habit, minutes) : 0
          set((s) => ({
            timer: null,
            focusSessions: [
              ...s.focusSessions,
              {
                id: uid(), startedAt: t.startedAt, minutes, label: t.label, areaId: t.areaId, goalId: t.goalId, taskId: t.taskId,
                habitId: habit?.id ?? null, habitAmount,
              },
            ],
          }))
          if (habit) {
            const day = todayKey(new Date(t.startedAt))
            get().setHabitAmount(habit.id, day, (get().habitLogs[habit.id]?.[day] ?? 0) + habitAmount)
          }
          return minutes
        }
        set({ timer: null })
        return 0
      },
      /** Deletes the session and takes back exactly what it added to its habit (ADR-029). */
      deleteFocusSession: (id) => {
        const f = get().focusSessions.find((x) => x.id === id)
        if (!f) return
        set((s) => ({ focusSessions: s.focusSessions.filter((x) => x.id !== id) }))
        if (f.habitId && f.habitAmount > 0) {
          const day = todayKey(new Date(f.startedAt))
          const have = get().habitLogs[f.habitId]?.[day] ?? 0
          if (have > 0) get().setHabitAmount(f.habitId, day, Math.max(0, have - f.habitAmount))
        }
      },

      // --- notes & reviews -------------------------------------------------------
      setDayNote: (day, patch) =>
        set((s) => ({
          dayNotes: { ...s.dayNotes, [day]: { intention: '', mood: 0, reflection: '', ...(s.dayNotes[day] as DayNote | undefined), ...patch } },
        })),
      saveReview: (r) => set((s) => ({ reviews: { ...s.reviews, [r.weekStart]: { ...r, savedAt: now() } } })),

      // --- memories --------------------------------------------------------------
      addMemory: (m) => {
        const id = uid()
        set((s) => ({ memories: [...s.memories, { ...m, id, createdAt: now() }] }))
        return id
      },
      updateMemory: (id, patch) =>
        set((s) => ({ memories: s.memories.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      deleteMemory: (id) => {
        const m = get().memories.find((x) => x.id === id)
        set((s) => ({ memories: s.memories.filter((x) => x.id !== id) }))
        return m
      },
      restoreMemory: (m) => set((s) => ({ memories: [...s.memories, m] })),

      // --- ideas -----------------------------------------------------------------
      addIdea: (i) => {
        const id = uid()
        const t = now()
        set((s) => ({
          ideas: [...s.ideas, { notes: '', areaId: null, status: 'new', ...i, id, taskIds: [], goalId: null, createdAt: t, updatedAt: t }],
        }))
        return id
      },
      updateIdea: (id, patch) =>
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i)) })),
      setIdeaStatus: (id, status) => get().updateIdea(id, { status }),
      deleteIdea: (id) => {
        const i = get().ideas.find((x) => x.id === id)
        set((s) => ({ ideas: s.ideas.filter((x) => x.id !== id) }))
        return i
      },
      restoreIdea: (i) => set((s) => ({ ideas: [...s.ideas, i] })),
      ideaToTask: (ideaId, title, date) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        const taskId = get().addTask({ title, date, areaId: idea?.areaId ?? null, goalId: idea?.goalId ?? null, notes: idea ? tx().f(tx().m.store.fromIdea, { title: idea.title }) : '' })
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === ideaId
              ? { ...i, taskIds: [...i.taskIds, taskId], status: i.status === 'new' || i.status === 'exploring' ? 'doing' : i.status, updatedAt: now() }
              : i,
          ),
        }))
        return taskId
      },
      linkIdeaGoal: (ideaId, goalId) => get().updateIdea(ideaId, { goalId, status: 'doing' }),

      // --- notes (ADR-035) ---------------------------------------------------------
      addNote: (n) => {
        const id = uid()
        const t = now()
        set((s) => ({
          notes: [...s.notes, {
            title: '', body: '', items: [], color: null, labels: [], pinned: false, onToday: false, archived: false,
            areaId: null, projectId: null, goalId: null, ...n, id, taskIds: [], createdAt: t, updatedAt: t,
          }],
        }))
        return id
      },
      updateNote: (id, patch) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)) })),
      deleteNote: (id) => {
        const n = get().notes.find((x) => x.id === id)
        set((s) => ({ notes: s.notes.filter((x) => x.id !== id) }))
        return n
      },
      restoreNote: (n) => set((s) => ({ notes: [...s.notes, n] })),
      toggleNoteItem: (noteId, itemId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId ? { ...n, items: n.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)), updatedAt: now() } : n,
          ),
        })),
      noteToTask: (noteId, title, date, itemId) => {
        const note = get().notes.find((n) => n.id === noteId)
        const fromLine = !!note && !!itemId && note.items.some((i) => i.id === itemId)
        const taskId = get().addTask({
          title, date, areaId: note?.areaId ?? null, goalId: note?.goalId ?? null, projectId: note?.projectId ?? null,
          notes: !note ? '' : fromLine || !note.body ? tx().f(tx().m.store.fromNote, { title: note.title || title }) : note.body,
        })
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id !== noteId ? n
              : fromLine ? { ...n, items: n.items.map((i) => (i.id === itemId ? { ...i, taskId } : i)), updatedAt: now() }
              : { ...n, taskIds: [...n.taskIds, taskId], updatedAt: now() },
          ),
        }))
        return taskId
      },

      // --- reminders -------------------------------------------------------------
      addReminder: (r) => {
        const id = uid()
        set((s) => ({ reminders: [...s.reminders, { contactId: null, countYears: true, ...r, id, done: false, createdAt: now() }] }))
        return id
      },
      updateReminder: (id, patch) =>
        set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteReminder: (id) => {
        const r = get().reminders.find((x) => x.id === id)
        set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) }))
        return r
      },
      restoreReminder: (r) => set((s) => ({ reminders: [...s.reminders, r] })),

      // --- projects --------------------------------------------------------------
      addProject: (p) => {
        const id = uid()
        const t = now()
        set((s) => ({
          projects: [...s.projects, {
            emoji: '🚀', description: '', areaId: null, goalId: null, status: 'active', startDate: todayKey(), dueDate: null,
            notes: '', links: [], progressMode: 'tasks', manualProgress: 0, view: 'list', pinned: false, ...p, id, createdAt: t, updatedAt: t,
          }],
        }))
        return id
      },
      updateProject: (id, patch) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)) })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          projectUpdates: s.projectUpdates.filter((u) => u.projectId !== id),
          achievements: s.achievements.map((a) => (a.projectId === id ? { ...a, projectId: null } : a)),
          tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
          notes: s.notes.map((n) => (n.projectId === id ? { ...n, projectId: null } : n)),
        })),
      setProjectProgress: (id, percent) =>
        get().updateProject(id, { progressMode: 'manual', manualProgress: Math.round(Math.min(100, Math.max(0, percent))) }),
      addProjectUpdate: (u) => {
        const id = uid()
        set((s) => ({ projectUpdates: [...s.projectUpdates, { date: todayKey(), ...u, id, createdAt: now() }] }))
        if (u.progress !== null) get().setProjectProgress(u.projectId, u.progress)
        return id
      },
      deleteProjectUpdate: (id) => set((s) => ({ projectUpdates: s.projectUpdates.filter((u) => u.id !== id) })),
      ideaToProject: (ideaId) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        const id = get().addProject({ title: idea?.title ?? tx().m.store.newProject, description: idea?.notes ?? '', areaId: idea?.areaId ?? null, goalId: idea?.goalId ?? null, emoji: '💡' })
        if (idea) get().updateIdea(ideaId, { status: idea.status === 'new' || idea.status === 'exploring' ? 'doing' : idea.status })
        return id
      },

      // --- connections -----------------------------------------------------------
      addContact: (c) => {
        const id = uid()
        const t = now()
        set((s) => ({
          contacts: [...s.contacts, {
            emoji: '', circle: 'friend', tags: [], phone: '', email: '', link: '', company: '', role: '', howWeMet: '',
            birthday: '', notes: '', cadenceDays: null, lastContactManual: null, snoozedUntil: null, birthdayReminderId: null,
            favorite: false, archived: false, ...c, id, createdAt: t, updatedAt: t,
          }],
        }))
        return id
      },
      updateContact: (id, patch) =>
        set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)) })),
      deleteContact: (id) => {
        const c = get().contacts.find((x) => x.id === id)
        set((s) => ({
          contacts: s.contacts.filter((x) => x.id !== id),
          interactions: s.interactions.filter((i) => i.contactId !== id),
          reminders: s.reminders
            .filter((r) => r.id !== c?.birthdayReminderId)
            .map((r) => (r.contactId === id ? { ...r, contactId: null } : r)),
        }))
      },
      logInteraction: (contactId, kind, note, date) => {
        const id = uid()
        set((s) => ({
          interactions: [...s.interactions, { id, contactId, kind, note, date, createdAt: now() }],
          // A check-in clears any snooze.
          contacts: s.contacts.map((c) => (c.id === contactId && c.snoozedUntil ? { ...c, snoozedUntil: null, updatedAt: now() } : c)),
        }))
        return id
      },
      deleteInteraction: (id) => set((s) => ({ interactions: s.interactions.filter((i) => i.id !== id) })),
      snoozeContact: (id, until) => get().updateContact(id, { snoozedUntil: until }),
      syncBirthdayReminder: (contactId, wanted) => {
        const s = get()
        const c = s.contacts.find((x) => x.id === contactId)
        if (!c) return
        const existing = c.birthdayReminderId ? s.reminders.find((r) => r.id === c.birthdayReminderId) : undefined
        const when = birthdayReminderDate(c.birthday, todayKey())
        if (!wanted || !when) {
          if (existing) s.deleteReminder(existing.id)
          if (c.birthdayReminderId) s.updateContact(contactId, { birthdayReminderId: null })
          return
        }
        const fields = { title: tx().f(tx().m.store.birthday, { name: c.name }), date: when.date, countYears: when.countYears, contactId }
        if (existing) s.updateReminder(existing.id, fields)
        else {
          const rid = s.addReminder({ ...fields, notes: '', emoji: '🎂', time: null, repeat: 'yearly', alerts: [0, 10080], important: false })
          s.updateContact(contactId, { birthdayReminderId: rid })
        }
      },

      // --- achievements ------------------------------------------------------------
      addAchievement: (a) => {
        const id = uid()
        const t = now()
        set((s) => ({
          achievements: [...s.achievements, {
            story: '', date: todayKey(), category: 'personal', emoji: '🏆', impact: 2, highlight: false, tags: [], links: [],
            goalId: null, projectId: null, source: null, ...a, id, createdAt: t, updatedAt: t,
          }],
        }))
        return id
      },
      updateAchievement: (id, patch) =>
        set((s) => ({ achievements: s.achievements.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now() } : a)) })),
      deleteAchievement: (id) => {
        const a = get().achievements.find((x) => x.id === id)
        set((s) => ({ achievements: s.achievements.filter((x) => x.id !== id) }))
        return a
      },
      restoreAchievement: (a) => set((s) => ({ achievements: [...s.achievements, a] })),

      // --- training (ADR-027) -------------------------------------------------------
      addExercise: (e) => {
        const id = uid()
        const t = now()
        set((s) => ({
          exercises: [...s.exercises, {
            equipment: 'other', measure: 'weight', muscle: null, notes: '', incrementKg: 2.5, archived: false, ...e, id, createdAt: t, updatedAt: t,
          }],
        }))
        return id
      },
      updateExercise: (id, patch) =>
        set((s) => ({ exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)) })),
      deleteExercise: (id) => {
        if (get().workoutSets.some((x) => x.exerciseId === id)) {
          get().updateExercise(id, { archived: true })
          return 'archived'
        }
        set((s) => ({
          exercises: s.exercises.filter((e) => e.id !== id),
          routines: s.routines.map((r) =>
            r.items.some((i) => i.exerciseId === id) ? { ...r, items: r.items.filter((i) => i.exerciseId !== id), updatedAt: now() } : r,
          ),
          goals: s.goals.map((g) => (g.link?.kind === 'exercise' && g.link.exerciseId === id ? { ...g, link: null } : g)),
        }))
        return 'deleted'
      },
      addRoutine: (r) => {
        const id = uid()
        const t = now()
        set((s) => ({
          routines: [...s.routines, { emoji: '🏋️', items: [], notes: '', archived: false, ...r, id, order: s.routines.length, createdAt: t, updatedAt: t }],
        }))
        return id
      },
      updateRoutine: (id, patch) =>
        set((s) => ({ routines: s.routines.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)) })),
      deleteRoutine: (id) =>
        set((s) => ({
          routines: s.routines.filter((r) => r.id !== id),
          program: s.program && (s.program.weekdays.includes(id) || s.program.rotation.includes(id))
            ? {
                ...s.program,
                weekdays: s.program.weekdays.map((w) => (w === id ? null : w)),
                rotation: s.program.rotation.filter((r) => r !== id),
                updatedAt: now(),
              }
            : s.program,
        })),
      updateProgram: (patch) =>
        set((s) => ({
          program: {
            // A new program starts flexible with no weekly aim — the easiest start (ADR-028).
            mode: 'flexible', weekdays: [null, null, null, null, null, null, null], rotation: [], perWeek: 0, habitId: null,
            ...s.program, ...patch, updatedAt: now(),
          },
        })),
      startWorkout: (routineId, name) => {
        const id = uid()
        const t = now()
        const routine = routineId ? get().routines.find((r) => r.id === routineId) : undefined
        const workout: Workout = {
          id, routineId: routine?.id ?? null, name, date: todayKey(), startedAt: t, finishedAt: null,
          // A copy: editing the routine later never changes this workout (ADR-027).
          items: routine ? routine.items.map((i) => ({ ...i })) : [],
          note: '', tickedHabitId: null, createdAt: t, updatedAt: t,
        }
        set((s) => ({ workouts: [...s.workouts, workout] }))
        return id
      },
      updateWorkout: (id, patch) =>
        set((s) => ({ workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: now() } : w)) })),
      addWorkoutItem: (workoutId, item) => {
        const id = uid()
        const full: RoutineItem = {
          sets: 3, warmupSets: 0, repsMin: null, repsMax: null, kg: null, seconds: null, meters: null, restSec: 90, ...item, id,
        }
        set((s) => ({
          workouts: s.workouts.map((w) => (w.id === workoutId ? { ...w, items: [...w.items, full], updatedAt: now() } : w)),
        }))
        return id
      },
      logSet: (x) => {
        const id = uid()
        set((s) => ({ workoutSets: [...s.workoutSets, { ...x, id, createdAt: now() }] }))
        return id
      },
      updateSet: (id, patch) =>
        set((s) => ({ workoutSets: s.workoutSets.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteSet: (id) => set((s) => ({ workoutSets: s.workoutSets.filter((x) => x.id !== id) })),
      finishWorkout: (id) => {
        const s = get()
        const w = s.workouts.find((x) => x.id === id)
        if (!w || w.finishedAt) return
        const habitId = s.program?.habitId && s.habits.some((h) => h.id === s.program?.habitId) ? s.program.habitId : null
        set((st) => ({
          workouts: st.workouts.map((x) => (x.id === id ? { ...x, finishedAt: now(), tickedHabitId: habitId, updatedAt: now() } : x)),
        }))
        if (habitId) s.setHabitAmount(habitId, w.date, (s.habitLogs[habitId]?.[w.date] ?? 0) + 1)
        for (const g of get().goals) if (g.link) completeIfReached(g.id)
      },
      deleteWorkout: (id) => {
        const w = get().workouts.find((x) => x.id === id)
        if (!w) return
        set((s) => ({
          workouts: s.workouts.filter((x) => x.id !== id),
          workoutSets: s.workoutSets.filter((x) => x.workoutId !== id),
        }))
        const hid = w.tickedHabitId
        if (w.finishedAt && hid) {
          const have = get().habitLogs[hid]?.[w.date] ?? 0
          if (have > 0) get().setHabitAmount(hid, w.date, have - 1)
        }
      },

      // --- notifications (ADR-031) ----------------------------------------------
      savePushTarget: (t) => set((s) => ({ pushTargets: [...s.pushTargets.filter((x) => x.id !== t.id), t] })),
      removePushTarget: (id) => set((s) => ({ pushTargets: s.pushTargets.filter((x) => x.id !== id) })),

      // --- settings & data -------------------------------------------------------
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setDayStart: (on, patch = {}) => {
        const s = get()
        const fajr = { ...s.settings.fajr, ...patch }
        const want = on ? resolveFajr(fajr, deviceZone()) : null
        set({ settings: { ...s.settings, fajr }, fajrSpans: switchFajr(s.fajrSpans, want, now(), uid()) })
        return !!want
      },
      completeOnboarding: (name, starter) =>
        set((s) => ({
          ...(starter ? starterData(todayKey()) : {}),
          settings: { ...s.settings, name: name.trim(), onboarded: true },
        })),
      replaceAll: (d) => set({ ...d }),
      resetAll: () => set({ ...emptyData() }),
    }),
    {
      name: 'itqan-store',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): Data => ({
        areas: s.areas, tasks: s.tasks, habits: s.habits, habitLogs: s.habitLogs, goals: s.goals,
        goalLogs: s.goalLogs, focusSessions: s.focusSessions, timer: s.timer, dayNotes: s.dayNotes,
        reviews: s.reviews, memories: s.memories, ideas: s.ideas, notes: s.notes, reminders: s.reminders, projects: s.projects,
        projectUpdates: s.projectUpdates, contacts: s.contacts, interactions: s.interactions, achievements: s.achievements,
        exercises: s.exercises, routines: s.routines, program: s.program, workouts: s.workouts, workoutSets: s.workoutSets, pushTargets: s.pushTargets, fajrSpans: s.fajrSpans,
        settings: s.settings,
      }),
      migrate: (persisted, version) => migrate(persisted, version) as unknown as Store,
    },
  ),
)

// Every day in the app is read through the owner's Fajr spans (ADR-041): install them now and
// whenever they change — by a switch here, a sync from another device, or a restored backup.
setDayRule(useStore.getState().fajrSpans)
useStore.subscribe((s, prev) => { if (s.fajrSpans !== prev.fajrSpans) setDayRule(s.fajrSpans) })

function completeIfReached(goalId: ID): boolean {
  const s = useStore.getState()
  const g = s.goals.find((x) => x.id === goalId)
  if (!g || g.status === 'done') return false
  if (goalProgress(g, s) >= 1) {
    s.setGoalStatus(goalId, 'done')
    return true
  }
  return false
}

/** Plain data snapshot (no actions) for exports and derived calculations. */
export function snapshot(s: Store): Data {
  return {
    areas: s.areas, tasks: s.tasks, habits: s.habits, habitLogs: s.habitLogs, goals: s.goals,
    goalLogs: s.goalLogs, focusSessions: s.focusSessions, timer: s.timer, dayNotes: s.dayNotes,
    reviews: s.reviews, memories: s.memories, ideas: s.ideas, notes: s.notes, reminders: s.reminders, projects: s.projects,
    projectUpdates: s.projectUpdates, contacts: s.contacts, interactions: s.interactions, achievements: s.achievements,
    exercises: s.exercises, routines: s.routines, program: s.program, workouts: s.workouts, workoutSets: s.workoutSets, pushTargets: s.pushTargets, fajrSpans: s.fajrSpans,
    settings: s.settings,
  }
}

// Ask the browser not to evict our storage under pressure. Best-effort; ignored if refused.
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {})
}
