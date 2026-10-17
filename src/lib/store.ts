import { tx } from '../i18n/core'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { goalProgress } from './goals'
import { uid } from './id'
import { migrate, SCHEMA_VERSION } from './migrations'
import { emptyData, starterData } from './seed'
import { todayKey } from './date'
import type {
  Achievement, ActiveTimer, Area, Contact, Data, DateKey, DayNote, Goal, Habit, ID, Idea, IdeaStatus, InteractionKind, Memory,
  Project, ProjectUpdate, Reminder, Settings, Task, TaskStage, WeeklyReview,
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
  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'order' | 'archived'>) => ID
  updateHabit: (id: ID, patch: Partial<Habit>) => void
  deleteHabit: (id: ID) => void
  setHabitAmount: (id: ID, day: DateKey, amount: number) => void
  // goals
  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'status' | 'completedAt'>) => ID
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
  // settings & data
  updateSettings: (patch: Partial<Settings>) => void
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
        set((s) => ({ habits: [...s.habits, { ...h, id, archived: false, createdAt: now(), order: s.habits.length }] }))
        return id
      },
      updateHabit: (id, patch) =>
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
      deleteHabit: (id) =>
        set((s) => {
          const habitLogs = { ...s.habitLogs }
          delete habitLogs[id]
          return { habits: s.habits.filter((h) => h.id !== id), habitLogs }
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
        set((s) => ({ goals: [...s.goals, { ...g, id, status: 'active', completedAt: null, createdAt: now() }] }))
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
          set((s) => ({
            timer: null,
            focusSessions: [
              ...s.focusSessions,
              { id: uid(), startedAt: t.startedAt, minutes, label: t.label, areaId: t.areaId, goalId: t.goalId, taskId: t.taskId },
            ],
          }))
          return minutes
        }
        set({ timer: null })
        return 0
      },
      deleteFocusSession: (id) => set((s) => ({ focusSessions: s.focusSessions.filter((f) => f.id !== id) })),

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

      // --- settings & data -------------------------------------------------------
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
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
        reviews: s.reviews, memories: s.memories, ideas: s.ideas, reminders: s.reminders, projects: s.projects,
        projectUpdates: s.projectUpdates, contacts: s.contacts, interactions: s.interactions, achievements: s.achievements,
        settings: s.settings,
      }),
      migrate: (persisted, version) => migrate(persisted, version) as unknown as Store,
    },
  ),
)

function completeIfReached(goalId: ID): boolean {
  const s = useStore.getState()
  const g = s.goals.find((x) => x.id === goalId)
  if (!g || g.status === 'done') return false
  if (goalProgress(g, s.goalLogs) >= 1) {
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
    reviews: s.reviews, memories: s.memories, ideas: s.ideas, reminders: s.reminders, projects: s.projects,
    projectUpdates: s.projectUpdates, contacts: s.contacts, interactions: s.interactions, achievements: s.achievements,
    settings: s.settings,
  }
}

// Ask the browser not to evict our storage under pressure. Best-effort; ignored if refused.
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {})
}
