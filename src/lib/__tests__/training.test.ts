import { describe, expect, it } from 'vitest'
import { badges, xpEvents, XP } from '../gamification'
import { goalCurrent, goalProgress } from '../goals'
import { emptyData } from '../seed'
import {
  activeWorkout, bestWeekRun, dueRoutine, exerciseBest, exerciseHistory, fromUnit, lastTime, newRecords, oneRepMax,
  personalRecords, plannedPerWeek, recordCounts, suggestNext, toUnit, weekStats, workoutSummary,
} from '../training'
import type { Data, Effort, Exercise, Goal, Routine, RoutineItem, TrainingProgram, Workout, WorkoutSet } from '../types'

// 2026-10-17 is a Saturday, 2026-10-20 a Tuesday.

const exercise = (id: string, extra: Partial<Exercise> = {}): Exercise => ({
  id, name: id, equipment: 'barbell', measure: 'weight', muscle: 'chest', notes: '', incrementKg: 2.5, archived: false,
  createdAt: '', updatedAt: '', ...extra,
})
const routine = (id: string, extra: Partial<Routine> = {}): Routine => ({
  id, name: id, emoji: '', items: [], notes: '', archived: false, order: 0, createdAt: '', updatedAt: '', ...extra,
})
const item = (extra: Partial<RoutineItem> = {}): RoutineItem => ({
  id: 'i1', exerciseId: 'bench', sets: 3, warmupSets: 0, repsMin: 8, repsMax: 10, kg: 40, seconds: null, meters: null, restSec: 90, ...extra,
})
const program = (extra: Partial<TrainingProgram> = {}): TrainingProgram => ({
  mode: 'weekdays', weekdays: [null, null, null, null, null, null, null], rotation: [], perWeek: 3, habitId: null, updatedAt: '', ...extra,
})
let n = 0
const workout = (date: string, extra: Partial<Workout> = {}): Workout => {
  n++
  const startedAt = `${date}T18:${String(n % 60).padStart(2, '0')}:00`
  return {
    id: `w${n}`, routineId: null, name: '', date, startedAt, finishedAt: `${date}T19:${String(n % 60).padStart(2, '0')}:00`,
    items: [], note: '', tickedHabitId: null, createdAt: startedAt, updatedAt: startedAt, ...extra,
  }
}
const set = (w: Workout, reps: number | null, kg: number | null, effort: Effort | null = 'good', extra: Partial<WorkoutSet> = {}): WorkoutSet => {
  n++
  return {
    id: `s${n}`, workoutId: w.id, itemId: 'i1', exerciseId: 'bench', warmup: false, reps, kg, seconds: null, meters: null, effort,
    createdAt: `${w.date}T18:30:${String(n % 60).padStart(2, '0')}`, ...extra,
  }
}

describe('units', () => {
  it('kg is stored as typed; lb converts both ways without drifting', () => {
    expect(toUnit(40, 'kg')).toBe(40)
    expect(fromUnit(45, 'lb')).toBeCloseTo(20.4117, 4)
    expect(toUnit(fromUnit(45, 'lb'), 'lb')).toBe(45)
    expect(toUnit(fromUnit(137.5, 'lb'), 'lb')).toBe(137.5)
  })
})

describe('what is due today', () => {
  const routines = [routine('push'), routine('pull'), routine('legs')]

  it('nothing without a program or without routines in it', () => {
    expect(dueRoutine(null, routines, [], '2026-10-20')).toEqual({ kind: 'none' })
    expect(dueRoutine(program(), routines, [], '2026-10-20')).toEqual({ kind: 'none' })
  })
  it('fixed weekdays: the routine set for this day, a rest day otherwise', () => {
    const p = program({ weekdays: [null, null, 'push', null, 'pull', null, 'legs'] }) // Tue, Thu, Sat
    expect(dueRoutine(p, routines, [], '2026-10-20')).toEqual({ kind: 'routine', routineId: 'push' })
    expect(dueRoutine(p, routines, [], '2026-10-17')).toEqual({ kind: 'routine', routineId: 'legs' })
    expect(dueRoutine(p, routines, [], '2026-10-19')).toEqual({ kind: 'rest' })
  })
  it('a deleted or archived routine on a weekday is a rest day', () => {
    const p = program({ weekdays: [null, null, 'gone', null, 'pull', null, null] })
    expect(dueRoutine(p, routines, [], '2026-10-20')).toEqual({ kind: 'rest' })
    const archived = [routine('push', { archived: true }), routine('pull')]
    expect(dueRoutine(program({ weekdays: [null, null, 'push', null, 'pull', null, null] }), archived, [], '2026-10-20')).toEqual({ kind: 'rest' })
  })
  it('rotation: starts at the first, then follows the last finished workout — a skipped day waits', () => {
    const p = program({ mode: 'rotation', rotation: ['push', 'pull', 'legs'] })
    expect(dueRoutine(p, routines, [], '2026-10-20')).toEqual({ kind: 'routine', routineId: 'push' })
    const done = [workout('2026-10-10', { routineId: 'push' }), workout('2026-10-12', { routineId: 'pull' })]
    // A week later, nothing done in between: still legs.
    expect(dueRoutine(p, routines, done, '2026-10-20')).toEqual({ kind: 'routine', routineId: 'legs' })
    done.push(workout('2026-10-20', { routineId: 'legs' }))
    expect(dueRoutine(p, routines, done, '2026-10-21')).toEqual({ kind: 'routine', routineId: 'push' })
  })
  it('rotation: unfinished workouts and other routines don’t move it on', () => {
    const p = program({ mode: 'rotation', rotation: ['push', 'pull'] })
    const ws = [workout('2026-10-18', { routineId: 'push' }), workout('2026-10-19', { routineId: 'pull', finishedAt: null }), workout('2026-10-19', { routineId: 'legs' })]
    expect(dueRoutine(p, routines, ws, '2026-10-20')).toEqual({ kind: 'routine', routineId: 'pull' })
  })
  it('rotation: a routine that appears twice (A B A C) is followed by the right one', () => {
    const p = program({ mode: 'rotation', rotation: ['push', 'pull', 'push', 'legs'] })
    const ws = [workout('2026-10-14', { routineId: 'push' }), workout('2026-10-15', { routineId: 'pull' }), workout('2026-10-16', { routineId: 'push' })]
    expect(dueRoutine(p, routines, ws, '2026-10-20')).toEqual({ kind: 'routine', routineId: 'legs' })
    ws.push(workout('2026-10-17', { routineId: 'legs' }))
    expect(dueRoutine(p, routines, ws, '2026-10-20')).toEqual({ kind: 'routine', routineId: 'push' })
  })
  it('the workout in progress is the newest unfinished one', () => {
    const a = workout('2026-10-19', { finishedAt: null })
    const b = workout('2026-10-20', { finishedAt: null })
    expect(activeWorkout([a, workout('2026-10-20'), b])?.id).toBe(b.id)
    expect(activeWorkout([workout('2026-10-20')])).toBeUndefined()
  })
})

describe('last time', () => {
  it('is the newest earlier workout with that exercise, never the one in progress', () => {
    const w1 = workout('2026-10-14'), w2 = workout('2026-10-17'), now = workout('2026-10-20', { finishedAt: null })
    const sets = [set(w1, 8, 37.5), set(w2, 8, 40), set(w2, 7, 40), set(now, 8, 42.5)]
    const last = lastTime('bench', [w1, w2, now], sets, now)!
    expect(last.workout.id).toBe(w2.id)
    expect(last.sets.map((s) => s.reps)).toEqual([8, 7])
  })
  it('shows the same routine slot when the exercise appeared twice', () => {
    const w = workout('2026-10-17')
    const sets = [set(w, 5, 60, 'hard', { itemId: 'heavy' }), set(w, 12, 40, 'good', { itemId: 'light' })]
    expect(lastTime('bench', [w], sets, undefined, 'light')!.sets.map((s) => s.kg)).toEqual([40])
    expect(lastTime('bench', [w], sets, undefined, 'unknown')!.sets).toHaveLength(2)
  })
  it('nothing when the exercise was never done', () => {
    expect(lastTime('bench', [], [])).toBeNull()
  })
})

describe('suggestion for next time', () => {
  const bench = exercise('bench')
  const hist = (...workouts: [Effort | null, number][][]) =>
    workouts.map((sets, i) => {
      const w = workout(`2026-10-${String(19 - i).padStart(2, '0')}`)
      return { workout: w, sets: sets.map(([effort, reps]) => set(w, reps, 40, effort)) }
    })

  it('every set at the top of the range, Easy or Good → one step up', () => {
    expect(suggestNext(item(), bench, hist([['good', 10], ['easy', 10], ['good', 11]]))).toEqual({ kind: 'up', kg: 42.5 })
  })
  it('a Hard set, a short set, or too few sets → same weight', () => {
    expect(suggestNext(item(), bench, hist([['good', 10], ['hard', 10], ['good', 10]]))).toEqual({ kind: 'same', kg: 40 })
    expect(suggestNext(item(), bench, hist([['good', 10], ['good', 9], ['good', 10]]))).toEqual({ kind: 'same', kg: 40 })
    expect(suggestNext(item(), bench, hist([['good', 10], ['good', 10]]))).toEqual({ kind: 'same', kg: 40 })
  })
  it('warm-ups don’t count either way', () => {
    const [p] = hist([['good', 10], ['good', 10], ['good', 10]])
    p.sets.push(set(p.workout, 3, 20, 'failed', { warmup: true }))
    expect(suggestNext(item(), bench, [p])).toEqual({ kind: 'up', kg: 42.5 })
  })
  it('a failed set two workouts in a row → one step down; only once → same', () => {
    expect(suggestNext(item(), bench, hist([['good', 8], ['failed', 5]], [['failed', 6], ['good', 8]]))).toEqual({ kind: 'down', kg: 37.5 })
    expect(suggestNext(item(), bench, hist([['good', 8], ['failed', 5]], [['good', 8]]))).toEqual({ kind: 'same', kg: 40 })
  })
  it('uses the exercise’s own step', () => {
    expect(suggestNext(item(), exercise('db', { incrementKg: 2 }), hist([['good', 10], ['good', 10], ['good', 10]]))).toEqual({ kind: 'up', kg: 42 })
  })
  it('nothing without history, or for an exercise without weight', () => {
    expect(suggestNext(item(), bench, [])).toEqual({ kind: 'none' })
    expect(suggestNext(item(), exercise('pushup', { measure: 'reps' }), hist([['good', 10]]))).toEqual({ kind: 'none' })
  })
})

describe('personal records', () => {
  it('Epley one-rep max, only from 1–12 reps', () => {
    expect(oneRepMax(100, 1)).toBe(100)
    expect(oneRepMax(60, 10)).toBeCloseTo(80)
    expect(oneRepMax(60, 15)).toBeNull()
    expect(oneRepMax(0, 5)).toBeNull()
  })
  it('heaviest, most reps, best 1RM, best volume and reps at each weight — warm-ups never count', () => {
    const w1 = workout('2026-10-14'), w2 = workout('2026-10-17')
    const sets = [
      set(w1, 10, 40), set(w1, 10, 40), set(w1, 2, 100, 'easy', { warmup: true }),
      set(w2, 6, 45), set(w2, 12, 40),
    ]
    const r = personalRecords(exerciseHistory('bench', [w1, w2], sets))
    expect(r.kg).toEqual({ value: 45, date: '2026-10-17', workoutId: w2.id })
    expect(r.reps?.value).toBe(12)
    expect(r.e1rm?.value).toBeCloseTo(56) // 40 × (1 + 12/30)
    expect(r.volume).toEqual({ value: 800, date: '2026-10-14', workoutId: w1.id }) // 800 vs 270 + 480 = 750
    expect(r.repsAtKg['40'].value).toBe(12)
    expect(r.repsAtKg['45'].value).toBe(6)
  })
  it('a workout’s new records are against earlier workouts only; a first attempt is no record', () => {
    const w1 = workout('2026-10-14'), w2 = workout('2026-10-17')
    const sets = [set(w1, 8, 40), set(w2, 8, 42.5), set(w2, 9, 40)]
    expect(newRecords(w1, [w1, w2], sets)).toEqual([])
    const kinds = newRecords(w2, [w1, w2], sets).map((r) => r.kind)
    expect(kinds).toEqual(expect.arrayContaining(['kg', 'reps', 'e1rm', 'volume', 'repsAtKg']))
    expect(newRecords(w2, [w1, w2], sets).find((r) => r.kind === 'repsAtKg')).toMatchObject({ kg: 40, value: 9 })
  })
  it('equal is not a record, and a tied record keeps the day it was first set', () => {
    const w1 = workout('2026-10-14'), w2 = workout('2026-10-17')
    const sets = [set(w1, 8, 40), set(w2, 8, 40)]
    expect(newRecords(w2, [w1, w2], sets)).toEqual([])
    expect(personalRecords(exerciseHistory('bench', [w1, w2], sets)).kg).toEqual({ value: 40, date: '2026-10-14', workoutId: w1.id })
  })
  it('a later, heavier workout doesn’t take away an earlier workout’s records', () => {
    const w1 = workout('2026-10-10'), w2 = workout('2026-10-14'), w3 = workout('2026-10-17')
    const sets = [set(w1, 8, 40), set(w2, 8, 42.5), set(w3, 8, 50)]
    expect(newRecords(w2, [w1, w2, w3], sets).map((r) => r.kind)).toContain('kg')
  })
  it('an lb weight round-tripped through kg still matches the same weight', () => {
    const w1 = workout('2026-10-14'), w2 = workout('2026-10-17')
    const sets = [set(w1, 8, fromUnit(45, 'lb')), set(w2, 9, fromUnit(45, 'lb') + 1e-12)]
    expect(newRecords(w2, [w1, w2], sets).find((r) => r.kind === 'repsAtKg')).toMatchObject({ value: 9 })
  })
  it('the one-pass count for every workout agrees with newRecords for each', () => {
    const ws = Array.from({ length: 12 }, (_, i) => workout(`2026-09-${String(i + 10).padStart(2, '0')}`, i === 5 ? { finishedAt: null } : {}))
    const sets: WorkoutSet[] = []
    ws.forEach((w, i) => {
      sets.push(set(w, 5 + ((i * 7) % 6), 30 + ((i * 5) % 4) * 2.5, i % 4 === 0 ? 'failed' : 'good'))
      sets.push(set(w, 8, 40, 'easy', { warmup: i % 3 === 0 }))
      if (i % 2) sets.push(set(w, null, null, 'good', { exerciseId: 'plank', seconds: 30 + ((i * 13) % 50) }))
    })
    const counts = recordCounts(ws, sets)
    for (const w of ws) expect(counts.get(w.id)).toBe(newRecords(w, ws, sets).length)
  })
  it('best for a goal ignores warm-ups', () => {
    const w = workout('2026-10-17')
    expect(exerciseBest('bench', 'kg', [set(w, 1, 100, 'easy', { warmup: true }), set(w, 5, 60)])).toBe(60)
  })
})

describe('summaries', () => {
  it('a workout: minutes, work sets, volume, exercises', () => {
    const w = workout('2026-10-20', { startedAt: '2026-10-20T18:00:00', finishedAt: '2026-10-20T19:05:00' })
    const sets = [set(w, 10, 40), set(w, 8, 50), set(w, 5, 20, 'easy', { warmup: true }), set(w, null, null, 'good', { exerciseId: 'plank', seconds: 60 })]
    expect(workoutSummary(w, sets)).toEqual({ minutes: 65, sets: 3, volumeKg: 800, exercises: 2 })
    expect(workoutSummary({ ...w, finishedAt: null }, sets).minutes).toBeNull()
  })
  it('planned per week: routine days, or the rotation’s target', () => {
    const rs = [routine('push'), routine('pull')]
    expect(plannedPerWeek(null, rs)).toBe(0)
    expect(plannedPerWeek(program({ weekdays: ['push', null, 'pull', null, 'gone', null, null] }), rs)).toBe(2)
    expect(plannedPerWeek(program({ mode: 'rotation', rotation: ['push'], perWeek: 4 }), rs)).toBe(4)
    expect(plannedPerWeek(program({ mode: 'rotation', rotation: [], perWeek: 4 }), rs)).toBe(0)
  })
  it('a week: finished workouts in it and work sets per muscle', () => {
    const ex = [exercise('bench', { muscle: 'chest' }), exercise('row', { muscle: 'back' }), exercise('misc', { muscle: null })]
    const inWeek = workout('2026-10-18'), before = workout('2026-10-16'), open = workout('2026-10-19', { finishedAt: null })
    const sets = [
      set(inWeek, 8, 40), set(inWeek, 8, 40), set(inWeek, 8, 20, 'good', { warmup: true }), set(inWeek, 8, 50, 'good', { exerciseId: 'row' }),
      set(inWeek, 8, 5, 'good', { exerciseId: 'misc' }), set(before, 8, 40), set(open, 8, 40),
    ]
    // Week starts Saturday: 2026-10-17 … 2026-10-23.
    const s = weekStats('2026-10-20', 6, program({ mode: 'rotation', rotation: ['push'], perWeek: 3 }), [routine('push')], [inWeek, before, open], sets, ex)
    expect(s).toEqual({ start: '2026-10-17', done: 1, planned: 3, setsByMuscle: { chest: 2, back: 1 } })
  })
  it('weeks in a row on plan; the current week counts once met, and doesn’t break the run before', () => {
    const ws = ['2026-09-26', '2026-09-28', '2026-10-03', '2026-10-05', '2026-10-10', '2026-10-12'].map((d) => workout(d))
    expect(bestWeekRun(ws, 2, 6, '2026-10-20')).toBe(3) // this week has none yet: still 3
    ws.push(workout('2026-10-18'), workout('2026-10-20'))
    expect(bestWeekRun(ws, 2, 6, '2026-10-20')).toBe(4)
    expect(bestWeekRun(ws, 3, 6, '2026-10-20')).toBe(0)
    expect(bestWeekRun([], 2, 6, '2026-10-20')).toBe(0)
  })
})

describe('linked goals', () => {
  const goal = (extra: Partial<Goal>): Goal => ({
    id: 'g', title: '', why: '', areaId: null, kind: 'numeric', startValue: 0, target: 80, unit: 'kg', startDate: '2026-10-01',
    deadline: null, milestones: [], status: 'active', completedAt: null, createdAt: '', link: null, ...extra,
  })
  it('an exercise goal follows the best set, or the best from before Itqan', () => {
    const w = workout('2026-10-17')
    const src = { goalLogs: [{ id: 'l', goalId: 'g', date: '2026-10-17', amount: 99, note: '', createdAt: '' }], workouts: [w], workoutSets: [set(w, 5, 60)] }
    const g = goal({ link: { kind: 'exercise', exerciseId: 'bench', metric: 'kg' } })
    expect(goalCurrent(g, src)).toBe(60) // check-ins are ignored for a linked goal
    expect(goalProgress(g, src)).toBeCloseTo(0.75)
    expect(goalCurrent({ ...g, startValue: 65 }, src)).toBe(65)
  })
  it('deleting the workout takes the progress with it — nothing is stored', () => {
    const g = goal({ link: { kind: 'exercise', exerciseId: 'bench', metric: 'kg' } })
    expect(goalCurrent(g, { goalLogs: [], workouts: [], workoutSets: [] })).toBe(0)
  })
  it('a workouts goal counts finished workouts from its start day', () => {
    const ws = [workout('2026-09-30'), workout('2026-10-01'), workout('2026-10-05'), workout('2026-10-06', { finishedAt: null })]
    expect(goalCurrent(goal({ target: 100, startValue: 2, link: { kind: 'workouts' } }), { goalLogs: [], workouts: ws, workoutSets: [] })).toBe(4)
  })
  it('an unlinked goal still adds up check-ins', () => {
    const src = { goalLogs: [{ id: 'l', goalId: 'g', date: '2026-10-17', amount: 3, note: '', createdAt: '' }], workouts: [], workoutSets: [] }
    expect(goalCurrent(goal({ startValue: 1 }), src)).toBe(4)
  })
})

describe('XP and badges from training', () => {
  const data = (workouts: Workout[], workoutSets: WorkoutSet[] = []): Data => ({ ...emptyData(), workouts, workoutSets })
  it('a finished workout earns XP on the day it started; one in progress earns nothing', () => {
    const late = workout('2026-10-19', { startedAt: '2026-10-19T23:40:00', finishedAt: '2026-10-20T00:30:00' })
    const ev = xpEvents(data([late, workout('2026-10-20', { finishedAt: null })])).filter((e) => e.kind === 'training')
    expect(ev).toEqual([{ date: '2026-10-19', kind: 'training', xp: XP.workout }])
  })
  it('new records add XP, at most three a workout', () => {
    const w1 = workout('2026-10-14'), w2 = workout('2026-10-17')
    const ev = xpEvents(data([w1, w2], [set(w1, 8, 40), set(w2, 9, 42.5)])).filter((e) => e.kind === 'training')
    expect(ev.map((e) => e.xp)).toEqual([XP.workout, XP.workout + 3 * XP.record])
  })
  it('badges: first workout, a record', () => {
    const w1 = workout('2026-10-14'), w2 = workout('2026-10-17')
    const unlocked = (d: Data) => badges(d, '2026-10-20').filter((b) => b.unlocked).map((b) => b.id)
    expect(unlocked(data([]))).not.toContain('workout-1')
    expect(unlocked(data([w1], [set(w1, 8, 40)]))).toContain('workout-1')
    expect(unlocked(data([w1], [set(w1, 8, 40)]))).not.toContain('record-1')
    expect(unlocked(data([w1, w2], [set(w1, 8, 40), set(w2, 8, 45)]))).toContain('record-1')
  })
})
