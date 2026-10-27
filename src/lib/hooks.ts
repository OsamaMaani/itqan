import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { todayKey } from './date'
import { dayStreak, levelInfo, totalXp, xpEvents, xpOn } from './gamification'
import type { GoalSources } from './goals'
import { useStore } from './store'
import type { Area, Data } from './types'
import { AREA_HEX, NEUTRAL_HEX } from './colors'

/** Today's DateKey, refreshed when the day rolls over (at midnight or Fajr) while the app is open. */
export function useToday(): string {
  const [k, setK] = useState(todayKey())
  // Turning "a day starts at Fajr" on or off can move today at once (ADR-041).
  const spans = useStore((s) => s.fajrSpans)
  useEffect(() => {
    setK(todayKey())
    const id = setInterval(() => setK((prev) => (prev === todayKey() ? prev : todayKey())), 30_000)
    return () => clearInterval(id)
  }, [spans])
  return k
}

/** Re-render every `ms` while `active`. */
export function useTick(ms: number, active = true): number {
  const [n, setN] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setN(Date.now())
    const id = setInterval(() => setN(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms, active])
  return n
}

/** All persisted data as one object, stable while nothing changes. */
export function useData(): Data {
  return useStore(
    useShallow((s) => ({
      areas: s.areas, tasks: s.tasks, habits: s.habits, habitLogs: s.habitLogs, goals: s.goals,
      goalLogs: s.goalLogs, focusSessions: s.focusSessions, timer: s.timer, dayNotes: s.dayNotes,
      reviews: s.reviews, memories: s.memories, ideas: s.ideas, notes: s.notes, reminders: s.reminders, projects: s.projects,
      projectUpdates: s.projectUpdates, achievements: s.achievements, contacts: s.contacts, interactions: s.interactions,
      exercises: s.exercises, routines: s.routines, program: s.program, workouts: s.workouts, workoutSets: s.workoutSets, pushTargets: s.pushTargets, fajrSpans: s.fajrSpans, settings: s.settings,
    })),
  )
}

/** What goal progress is read from (check-ins, workouts, sets), stable while none change. */
export function useGoalSources(): GoalSources {
  return useStore(useShallow((s) => ({ goalLogs: s.goalLogs, workouts: s.workouts, workoutSets: s.workoutSets })))
}

export function useProgress() {
  const d = useData()
  const today = useToday()
  return useMemo(() => {
    const events = xpEvents(d)
    const total = totalXp(events)
    const day = dayStreak(events, today)
    return { events, total, level: levelInfo(total), todayXp: xpOn(events, today), streak: day.current, day }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.tasks, d.habits, d.habitLogs, d.focusSessions, d.goals, d.goalLogs, d.reviews, d.dayNotes, d.memories, d.ideas, d.interactions, d.contacts, d.achievements, d.projects, d.workouts, d.workoutSets, d.fajrSpans, today])
}

export function useAreaMap(): Map<string, Area> {
  const areas = useStore((s) => s.areas)
  return useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas])
}

export function areaHex(a: Area | undefined | null): string {
  return a ? AREA_HEX[a.color] : NEUTRAL_HEX
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}
