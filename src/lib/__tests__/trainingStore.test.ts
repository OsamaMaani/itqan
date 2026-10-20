import { beforeEach, describe, expect, it } from 'vitest'
import { todayKey } from '../date'
import { emptyData } from '../seed'
import { useStore } from '../store'

const st = () => useStore.getState()

beforeEach(() => {
  useStore.setState({ ...emptyData() })
})

function routineWithBench() {
  const bench = st().addExercise({ name: 'Bench press', equipment: 'barbell' })
  const rid = st().addRoutine({ name: 'Push' })
  const item = { id: 'i1', exerciseId: bench, sets: 3, warmupSets: 1, repsMin: 8, repsMax: 10, kg: 40, seconds: null, meters: null, restSec: 90 }
  st().updateRoutine(rid, { items: [item] })
  return { bench, rid, item }
}

describe('workouts', () => {
  it('start on today’s local day with a copy of the routine; editing the routine later changes nothing', () => {
    const { rid, item } = routineWithBench()
    const wid = st().startWorkout(rid, 'Push')
    const w = st().workouts.find((x) => x.id === wid)!
    expect(w).toMatchObject({ routineId: rid, name: 'Push', date: todayKey(), finishedAt: null, items: [item] })
    st().updateRoutine(rid, { items: [{ ...item, sets: 5, kg: 60 }] })
    expect(st().workouts.find((x) => x.id === wid)!.items).toEqual([item])
  })
  it('finishing ticks the linked habit once, on the workout’s day; deleting takes exactly that tick back', () => {
    const { rid } = routineWithBench()
    const hid = st().addHabit({ name: 'Exercise', emoji: '', areaId: null, schedule: { type: 'weekly', times: 3 }, target: 1, unit: '' })
    st().updateProgram({ habitId: hid })
    const day = todayKey()
    st().setHabitAmount(hid, day, 1) // already ticked by hand today

    const wid = st().startWorkout(rid, 'Push')
    st().finishWorkout(wid)
    st().finishWorkout(wid) // a second finish does nothing
    expect(st().habitLogs[hid][day]).toBe(2)
    expect(st().workouts[0].tickedHabitId).toBe(hid)

    st().updateProgram({ habitId: null }) // unlinking later doesn't strand the tick
    st().deleteWorkout(wid)
    expect(st().habitLogs[hid][day]).toBe(1) // the hand tick stays
    expect(st().workouts).toEqual([])
  })
  it('deleting an unfinished workout touches no habit', () => {
    const hid = st().addHabit({ name: 'Exercise', emoji: '', areaId: null, schedule: { type: 'daily' }, target: 1, unit: '' })
    st().updateProgram({ habitId: hid })
    st().setHabitAmount(hid, todayKey(), 1)
    const wid = st().startWorkout(null, 'Free')
    st().deleteWorkout(wid)
    expect(st().habitLogs[hid][todayKey()]).toBe(1)
  })
  it('deleting a workout deletes its sets and no one else’s', () => {
    const { bench, rid } = routineWithBench()
    const a = st().startWorkout(rid, 'Push')
    const b = st().startWorkout(rid, 'Push')
    const set = (workoutId: string) => st().logSet({ workoutId, itemId: 'i1', exerciseId: bench, warmup: false, reps: 8, kg: 40, seconds: null, meters: null, effort: 'good' })
    set(a); set(a); const keep = set(b)
    st().deleteWorkout(a)
    expect(st().workoutSets.map((x) => x.id)).toEqual([keep])
  })
  it('added exercises go to the workout only', () => {
    const { rid } = routineWithBench()
    const wid = st().startWorkout(rid, 'Push')
    const plank = st().addExercise({ name: 'Plank', measure: 'time' })
    st().addWorkoutItem(wid, { exerciseId: plank, seconds: 60 })
    expect(st().workouts[0].items.map((i) => i.exerciseId)).toContain(plank)
    expect(st().routines[0].items).toHaveLength(1)
  })
})

describe('deleting things training refers to', () => {
  it('an exercise with history is archived, never deleted', () => {
    const { bench, rid } = routineWithBench()
    const wid = st().startWorkout(rid, 'Push')
    st().logSet({ workoutId: wid, itemId: 'i1', exerciseId: bench, warmup: false, reps: 8, kg: 40, seconds: null, meters: null, effort: 'easy' })
    expect(st().deleteExercise(bench)).toBe('archived')
    expect(st().exercises[0]).toMatchObject({ id: bench, archived: true })
    expect(st().workoutSets).toHaveLength(1)
  })
  it('an exercise without history is deleted, and leaves routines and goals cleanly', () => {
    const { bench, rid } = routineWithBench()
    const gid = st().addGoal({ title: 'Bench 80', why: '', areaId: null, kind: 'numeric', startValue: 0, target: 80, unit: 'kg', startDate: todayKey(), deadline: null, milestones: [], link: { kind: 'exercise', exerciseId: bench, metric: 'kg' } })
    expect(st().deleteExercise(bench)).toBe('deleted')
    expect(st().exercises).toEqual([])
    expect(st().routines.find((r) => r.id === rid)!.items).toEqual([])
    expect(st().goals.find((g) => g.id === gid)!.link).toBeNull()
  })
  it('a routine leaves the program but past workouts keep their copy', () => {
    const { rid, item } = routineWithBench()
    st().updateProgram({ mode: 'rotation', rotation: [rid, 'other'], weekdays: [rid, null, null, null, null, null, null] })
    const wid = st().startWorkout(rid, 'Push')
    st().deleteRoutine(rid)
    expect(st().program).toMatchObject({ rotation: ['other'], weekdays: [null, null, null, null, null, null, null] })
    expect(st().workouts.find((w) => w.id === wid)!.items).toEqual([item])
  })
  it('a habit leaves the program link', () => {
    const hid = st().addHabit({ name: 'Gym', emoji: '', areaId: null, schedule: { type: 'daily' }, target: 1, unit: '' })
    st().updateProgram({ habitId: hid })
    st().deleteHabit(hid)
    expect(st().program!.habitId).toBeNull()
  })
})

describe('program', () => {
  it('a new program starts as "whenever I can" with no weekly aim', () => {
    st().updateProgram({ habitId: null })
    expect(st().program).toMatchObject({ mode: 'flexible', perWeek: 0 })
  })
  it('does not exist until first saved, then keeps every choice', () => {
    expect(st().program).toBeNull()
    st().updateProgram({ mode: 'rotation', perWeek: 4 })
    st().updateProgram({ rotation: ['a', 'b'] })
    expect(st().program).toMatchObject({ mode: 'rotation', perWeek: 4, rotation: ['a', 'b'], habitId: null })
    expect(st().program!.weekdays).toHaveLength(7)
  })
})

describe('linked goals', () => {
  it('finishing the workout that reaches a linked goal completes it', () => {
    const { bench, rid } = routineWithBench()
    const gid = st().addGoal({ title: 'Bench 50', why: '', areaId: null, kind: 'numeric', startValue: 0, target: 50, unit: 'kg', startDate: todayKey(), deadline: null, milestones: [], link: { kind: 'exercise', exerciseId: bench, metric: 'kg' } })
    const count = st().addGoal({ title: '1 workout', why: '', areaId: null, kind: 'numeric', startValue: 0, target: 1, unit: '', startDate: todayKey(), deadline: null, milestones: [], link: { kind: 'workouts' } })
    const wid = st().startWorkout(rid, 'Push')
    st().logSet({ workoutId: wid, itemId: 'i1', exerciseId: bench, warmup: true, reps: 3, kg: 60, seconds: null, meters: null, effort: 'easy' })
    st().logSet({ workoutId: wid, itemId: 'i1', exerciseId: bench, warmup: false, reps: 5, kg: 47.5, seconds: null, meters: null, effort: 'hard' })
    st().finishWorkout(wid)
    expect(st().goals.find((g) => g.id === gid)!.status).toBe('active') // the 60 kg was a warm-up
    expect(st().goals.find((g) => g.id === count)!.status).toBe('done')

    const w2 = st().startWorkout(rid, 'Push')
    st().logSet({ workoutId: w2, itemId: 'i1', exerciseId: bench, warmup: false, reps: 3, kg: 50, seconds: null, meters: null, effort: 'hard' })
    st().finishWorkout(w2)
    expect(st().goals.find((g) => g.id === gid)!.status).toBe('done')
  })
})
