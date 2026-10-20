import { addDaysKey, dayOfWeek, rangeKeys, weekStartKey } from './date'
import type {
  DateKey, Exercise, ID, Muscle, Routine, RoutineItem, TrainingProgram, WeightUnit, Workout, WorkoutSet,
} from './types'

/**
 * Training maths (ADR-027, memory/11-training.md). Pure functions, no React, no store — every
 * number the Training screens show comes from here and is tested in training.test.ts. Weights
 * are kg, distances metres, durations seconds; lb exists only at the display edge.
 */

// --- units -------------------------------------------------------------------------------

export const KG_PER_LB = 0.45359237

/** A stored kg value in the unit the person reads, rounded for display (0.1). */
export function toUnit(kg: number, unit: WeightUnit): number {
  const v = unit === 'lb' ? kg / KG_PER_LB : kg
  return Math.round(v * 10) / 10
}

/** What the person typed, in their unit, back to kg — full precision, never rounded. */
export function fromUnit(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * KG_PER_LB : value
}

// --- what is due ---------------------------------------------------------------------------

export type Due =
  | { kind: 'none' } // no program, or nothing in it
  | { kind: 'rest' } // fixed weekdays, and today has no routine
  | { kind: 'routine'; routineId: ID }

const usable = (routines: Routine[]) => new Set(routines.filter((r) => !r.archived).map((r) => r.id))

const byStart = (a: Workout, b: Workout) => a.startedAt.localeCompare(b.startedAt)

/**
 * The routine today calls for. Weekdays: the routine set for this day of the week. Rotation: the
 * one after the last finished workout of the rotation — a skipped day waits for you, so it is
 * whatever comes next, whenever you go.
 */
export function dueRoutine(program: TrainingProgram | null, routines: Routine[], workouts: Workout[], today: DateKey): Due {
  if (!program) return { kind: 'none' }
  const ok = usable(routines)
  if (program.mode === 'weekdays') {
    if (!program.weekdays.some((id) => id && ok.has(id))) return { kind: 'none' }
    const id = program.weekdays[dayOfWeek(today)]
    return id && ok.has(id) ? { kind: 'routine', routineId: id } : { kind: 'rest' }
  }
  const rotation = program.rotation.filter((id) => ok.has(id))
  if (!rotation.length) return { kind: 'none' }
  const done = workouts
    .filter((w) => w.finishedAt && w.routineId && rotation.includes(w.routineId) && w.date <= today)
    .sort(byStart)
  // Replay the history through the rotation, so a routine that sits in it twice (A B A C) is
  // followed by the right next one: each workout matches the next occurrence after the last.
  let pos = -1
  for (const w of done) {
    for (let k = 1; k <= rotation.length; k++) {
      const j = (pos + k + rotation.length) % rotation.length
      if (rotation[j] === w.routineId) { pos = j; break }
    }
  }
  return { kind: 'routine', routineId: rotation[(pos + 1) % rotation.length] }
}

/** The workout still in progress, if any (newest first). */
export function activeWorkout(workouts: Workout[]): Workout | undefined {
  return workouts.filter((w) => !w.finishedAt).sort(byStart).at(-1)
}

// --- history -------------------------------------------------------------------------------

export interface Performance {
  workout: Workout
  /** Sets of this exercise in that workout, in the order they were logged */
  sets: WorkoutSet[]
}

/**
 * Every workout that has sets of this exercise, newest first, with those sets. `before` leaves
 * out the workout in progress and anything started after it.
 */
export function exerciseHistory(exerciseId: ID, workouts: Workout[], sets: WorkoutSet[], before?: Workout): Performance[] {
  const byWorkout = new Map<ID, WorkoutSet[]>()
  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue
    const list = byWorkout.get(s.workoutId)
    if (list) list.push(s)
    else byWorkout.set(s.workoutId, [s])
  }
  return workouts
    .filter((w) => byWorkout.has(w.id) && (!before || (w.id !== before.id && w.startedAt < before.startedAt)))
    .sort(byStart)
    .reverse()
    .map((workout) => ({ workout, sets: byWorkout.get(workout.id)!.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }))
}

/**
 * "Last time" for one exercise in a workout. When the last workout had the same routine slot
 * (the same exercise can appear twice in a routine), only that slot's sets are shown.
 */
export function lastTime(exerciseId: ID, workouts: Workout[], sets: WorkoutSet[], current?: Workout, itemId?: ID): Performance | null {
  const last = exerciseHistory(exerciseId, workouts, sets, current)[0]
  if (!last) return null
  const slot = itemId ? last.sets.filter((s) => s.itemId === itemId) : []
  return slot.length ? { ...last, sets: slot } : last
}

const work = (sets: WorkoutSet[]) => sets.filter((s) => !s.warmup)

// --- next time ---------------------------------------------------------------------------

export type Suggestion =
  | { kind: 'none' } // nothing to go on, or not a weighted exercise
  | { kind: 'up' | 'same' | 'down'; kg: number }

/**
 * What to lift next time (weighted exercises only — only a suggestion, the person decides):
 * - every work set of the last workout reached the top of the rep range at Easy or Good → one step up;
 * - a failed work set in each of the last two workouts → one step down;
 * - otherwise the same weight.
 * The weight is the heaviest work set of the last workout.
 */
export function suggestNext(item: RoutineItem, exercise: Exercise, history: Performance[]): Suggestion {
  if (exercise.measure !== 'weight') return { kind: 'none' }
  const last = history[0] ? work(history[0].sets) : []
  const weighted = last.filter((s) => s.kg !== null)
  if (!weighted.length) return { kind: 'none' }
  const kg = Math.max(...weighted.map((s) => s.kg!))
  const step = exercise.incrementKg > 0 ? exercise.incrementKg : 2.5

  const top = item.repsMax ?? item.repsMin
  const allTop = top !== null
    && last.length >= item.sets
    && last.every((s) => (s.reps ?? 0) >= top && (s.effort === 'easy' || s.effort === 'good' || s.effort === null))
  if (allTop) return { kind: 'up', kg: kg + step }

  const failed = (p?: Performance) => !!p && work(p.sets).some((s) => s.effort === 'failed')
  if (failed(history[0]) && failed(history[1])) return { kind: 'down', kg: Math.max(0, kg - step) }
  return { kind: 'same', kg }
}

// --- records -----------------------------------------------------------------------------

/** Estimated one-rep max (Epley). Only from 1–12 reps, where the formula holds. */
export function oneRepMax(kg: number, reps: number): number | null {
  if (reps < 1 || reps > 12 || kg <= 0) return null
  return reps === 1 ? kg : kg * (1 + reps / 30)
}

export interface Record_ { value: number; date: DateKey; workoutId: ID }

export interface Records {
  /** Heaviest work set */
  kg: Record_ | null
  /** Most reps in one work set (any weight) */
  reps: Record_ | null
  seconds: Record_ | null
  meters: Record_ | null
  /** Best estimated one-rep max */
  e1rm: Record_ | null
  /** Most kg × reps of this exercise in one workout */
  volume: Record_ | null
  /** Most reps ever done at each weight, keyed by kg */
  repsAtKg: Record<string, Record_>
}

const better = (cur: Record_ | null, value: number | null, w: Workout): Record_ | null =>
  value !== null && value > 0 && (!cur || value > cur.value + 1e-9) ? { value, date: w.date, workoutId: w.id } : cur

/** Key for "the same weight": kg rounded to grams, so 20.41166 and 20.41166000001 match. */
export const kgKey = (kg: number) => (Math.round(kg * 1000) / 1000).toString()

/** Personal records for one exercise. Warm-up sets never count. History is oldest first. */
export function personalRecords(history: Performance[]): Records {
  const r: Records = { kg: null, reps: null, seconds: null, meters: null, e1rm: null, volume: null, repsAtKg: {} }
  for (const { workout: w, sets } of [...history].sort((a, b) => byStart(a.workout, b.workout))) {
    let volume = 0
    for (const s of work(sets)) {
      r.kg = better(r.kg, s.kg, w)
      r.reps = better(r.reps, s.reps, w)
      r.seconds = better(r.seconds, s.seconds, w)
      r.meters = better(r.meters, s.meters, w)
      if (s.kg !== null && s.reps !== null) {
        r.e1rm = better(r.e1rm, oneRepMax(s.kg, s.reps), w)
        volume += s.kg * s.reps
        const k = kgKey(s.kg)
        const at = better(r.repsAtKg[k] ?? null, s.reps, w)
        if (at) r.repsAtKg[k] = at
      }
    }
    r.volume = better(r.volume, volume || null, w)
  }
  return r
}

export type RecordKind = 'kg' | 'reps' | 'seconds' | 'meters' | 'e1rm' | 'volume' | 'repsAtKg'

export interface NewRecord { exerciseId: ID; kind: RecordKind; value: number; kg?: number }

/**
 * Records this workout set — compared with every earlier workout of the same exercise. A first
 * ever attempt is not a record (there was nothing to beat), and reps at a weight count only at a
 * weight used before.
 */
export function newRecords(workout: Workout, workouts: Workout[], sets: WorkoutSet[]): NewRecord[] {
  const out: NewRecord[] = []
  const mine = sets.filter((s) => s.workoutId === workout.id)
  for (const exerciseId of [...new Set(mine.map((s) => s.exerciseId))]) {
    const before = exerciseHistory(exerciseId, workouts, sets, workout)
    if (!before.some((p) => work(p.sets).length)) continue
    const old = personalRecords(before)
    const now = personalRecords([{ workout, sets: mine.filter((s) => s.exerciseId === exerciseId) }])
    out.push(...beaten(old, now, exerciseId))
  }
  return out
}

const RECORD_KINDS = ['kg', 'reps', 'seconds', 'meters', 'e1rm', 'volume'] as const

/** `now` beats `old` on each kind (strictly). Both are one exercise's records. */
function beaten(old: Records, now: Records, exerciseId: ID): NewRecord[] {
  const out: NewRecord[] = []
  for (const kind of RECORD_KINDS) {
    const v = now[kind]?.value
    if (v !== undefined && old[kind] !== null && v > old[kind]!.value + 1e-9) out.push({ exerciseId, kind, value: v })
  }
  for (const [k, rec] of Object.entries(now.repsAtKg)) {
    const prev = old.repsAtKg[k]
    if (prev && rec.value > prev.value) out.push({ exerciseId, kind: 'repsAtKg', value: rec.value, kg: Number(k) })
  }
  return out
}

/** Keeps the better of each record; a tie keeps the older one. */
function combine(old: Records, now: Records): Records {
  const pick = (a: Record_ | null, b: Record_ | null) => (b && (!a || b.value > a.value + 1e-9) ? b : a)
  const repsAtKg = { ...old.repsAtKg }
  for (const [k, rec] of Object.entries(now.repsAtKg)) repsAtKg[k] = pick(repsAtKg[k] ?? null, rec)!
  return {
    kg: pick(old.kg, now.kg), reps: pick(old.reps, now.reps), seconds: pick(old.seconds, now.seconds),
    meters: pick(old.meters, now.meters), e1rm: pick(old.e1rm, now.e1rm), volume: pick(old.volume, now.volume), repsAtKg,
  }
}

/**
 * How many new records each workout set, for every workout at once — the same answer as
 * `newRecords(w).length`, in one pass through history instead of one per workout (XP and badges
 * read it on every change).
 */
export function recordCounts(workouts: Workout[], sets: WorkoutSet[]): Map<ID, number> {
  const byWorkout = new Map<ID, WorkoutSet[]>()
  for (const s of sets) {
    const list = byWorkout.get(s.workoutId)
    if (list) list.push(s)
    else byWorkout.set(s.workoutId, [s])
  }
  const best = new Map<ID, Records>()
  const counts = new Map<ID, number>()
  for (const w of [...workouts].sort(byStart)) {
    const mine = byWorkout.get(w.id) ?? []
    let count = 0
    const updates: [ID, Records][] = []
    for (const exerciseId of new Set(mine.map((s) => s.exerciseId))) {
      const now = personalRecords([{ workout: w, sets: mine.filter((s) => s.exerciseId === exerciseId) }])
      const old = best.get(exerciseId)
      if (old) count += beaten(old, now, exerciseId).length
      updates.push([exerciseId, old ? combine(old, now) : now])
    }
    for (const [id, r] of updates) best.set(id, r)
    counts.set(w.id, count)
  }
  return counts
}

/** An exercise's best for a linked goal — warm-ups excluded, every workout counted. */
export function exerciseBest(exerciseId: ID, metric: 'kg' | 'reps' | 'seconds', sets: WorkoutSet[]): number {
  let best = 0
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || s.warmup) continue
    const v = s[metric]
    if (v !== null && v > best) best = v
  }
  return best
}

// --- summaries -----------------------------------------------------------------------------

export interface WorkoutSummary {
  /** null while in progress */
  minutes: number | null
  /** Work sets */
  sets: number
  /** Σ kg × reps over work sets */
  volumeKg: number
  exercises: number
}

export function workoutSummary(workout: Workout, sets: WorkoutSet[]): WorkoutSummary {
  const mine = work(sets.filter((s) => s.workoutId === workout.id))
  const minutes = workout.finishedAt
    ? Math.max(0, Math.round((Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)) / 60000))
    : null
  return {
    minutes,
    sets: mine.length,
    volumeKg: mine.reduce((v, s) => v + (s.kg !== null && s.reps !== null ? s.kg * s.reps : 0), 0),
    exercises: new Set(mine.map((s) => s.exerciseId)).size,
  }
}

/** Finished workouts on a day, oldest first. */
export function workoutsOn(day: DateKey, workouts: Workout[]): Workout[] {
  return workouts.filter((w) => w.finishedAt && w.date === day).sort(byStart)
}

/** Days with at least one finished workout. */
export function trainingDays(workouts: Workout[]): Set<DateKey> {
  return new Set(workouts.filter((w) => w.finishedAt).map((w) => w.date))
}

/** How many workouts a week the program asks for: the routine days, or the rotation's target. */
export function plannedPerWeek(program: TrainingProgram | null, routines: Routine[]): number {
  if (!program) return 0
  const ok = usable(routines)
  if (program.mode === 'weekdays') return program.weekdays.filter((id) => id && ok.has(id)).length
  return program.rotation.some((id) => ok.has(id)) ? Math.max(0, program.perWeek) : 0
}

export interface WeekStats {
  start: DateKey
  done: number
  planned: number
  /** Work sets per muscle group; exercises without one are left out */
  setsByMuscle: Partial<Record<Muscle, number>>
}

export function weekStats(
  day: DateKey, weekStartsOn: 0 | 1 | 6, program: TrainingProgram | null, routines: Routine[],
  workouts: Workout[], sets: WorkoutSet[], exercises: Exercise[],
): WeekStats {
  const start = weekStartKey(day, weekStartsOn)
  const days = new Set(rangeKeys(start, addDaysKey(start, 6)))
  const inWeek = workouts.filter((w) => w.finishedAt && days.has(w.date))
  const ids = new Set(inWeek.map((w) => w.id))
  const muscle = new Map(exercises.map((e) => [e.id, e.muscle]))
  const setsByMuscle: Partial<Record<Muscle, number>> = {}
  for (const s of sets) {
    if (!ids.has(s.workoutId) || s.warmup) continue
    const m = muscle.get(s.exerciseId)
    if (m) setsByMuscle[m] = (setsByMuscle[m] ?? 0) + 1
  }
  return { start, done: inWeek.length, planned: plannedPerWeek(program, routines), setsByMuscle }
}

/**
 * The longest run of consecutive weeks in which the plan was met (at least one workout when
 * nothing is planned). The current week counts only once it is met — it is not over yet.
 */
export function bestWeekRun(workouts: Workout[], planned: number, weekStartsOn: 0 | 1 | 6, today: DateKey): number {
  const counts = new Map<DateKey, number>()
  for (const w of workouts) {
    if (!w.finishedAt) continue
    const k = weekStartKey(w.date, weekStartsOn)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  if (!counts.size) return 0
  const need = Math.max(1, planned)
  const first = [...counts.keys()].sort()[0]
  const thisWeek = weekStartKey(today, weekStartsOn)
  let best = 0
  let run = 0
  for (let k = first; k <= thisWeek; k = addDaysKey(k, 7)) {
    if ((counts.get(k) ?? 0) >= need) best = Math.max(best, ++run)
    else if (k !== thisWeek) run = 0
  }
  return best
}
