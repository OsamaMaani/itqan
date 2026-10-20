import { tx, type I18n } from '../i18n/core'
import type { Equipment, Exercise, Measure, Muscle } from './types'

/**
 * "Add common exercises" (ADR-027): a starter list, opt-in, created in the interface language at
 * that moment and the owner's data afterwards. Never added by an upgrade.
 */
const STARTER: [key: keyof I18n['m']['gym']['starter'], equipment: Equipment, measure: Measure, muscle: Muscle][] = [
  ['benchPress', 'barbell', 'weight', 'chest'],
  ['inclineDumbbellPress', 'dumbbell', 'weight', 'chest'],
  ['pushUps', 'bodyweight', 'reps', 'chest'],
  ['overheadPress', 'barbell', 'weight', 'shoulders'],
  ['lateralRaise', 'dumbbell', 'weight', 'shoulders'],
  ['pullUps', 'bodyweight', 'reps', 'back'],
  ['latPulldown', 'cable', 'weight', 'back'],
  ['cableRow', 'cable', 'weight', 'back'],
  ['dumbbellRow', 'dumbbell', 'weight', 'back'],
  ['deadlift', 'barbell', 'weight', 'hamstrings'],
  ['squat', 'barbell', 'weight', 'quads'],
  ['legPress', 'machine', 'weight', 'quads'],
  ['lunges', 'dumbbell', 'weight', 'quads'],
  ['romanianDeadlift', 'barbell', 'weight', 'hamstrings'],
  ['legCurl', 'machine', 'weight', 'hamstrings'],
  ['hipThrust', 'barbell', 'weight', 'glutes'],
  ['calfRaise', 'machine', 'weight', 'calves'],
  ['bicepsCurl', 'dumbbell', 'weight', 'biceps'],
  ['tricepsPushdown', 'cable', 'weight', 'triceps'],
  ['dips', 'bodyweight', 'reps', 'triceps'],
  ['plank', 'bodyweight', 'time', 'core'],
  ['crunches', 'bodyweight', 'reps', 'core'],
  ['running', 'other', 'distance', 'cardio'],
  ['cycling', 'machine', 'distance', 'cardio'],
  ['rowing', 'machine', 'distance', 'cardio'],
  ['jumpRope', 'other', 'time', 'cardio'],
]

/** The usual step for "go heavier" on each kind of equipment, in kg. */
export const DEFAULT_INCREMENT: Record<Equipment, number> = {
  bodyweight: 2.5, dumbbell: 2, barbell: 2.5, machine: 2.5, cable: 2.5, kettlebell: 4, band: 0, other: 2.5,
}

export type NewExercise = Pick<Exercise, 'name' | 'equipment' | 'measure' | 'muscle' | 'incrementKg'>

/** The starter exercises not already there (same name, ignoring case), in the given language. */
export function starterExercises(existing: Pick<Exercise, 'name'>[], t: I18n = tx()): NewExercise[] {
  const have = new Set(existing.map((e) => e.name.trim().toLocaleLowerCase()))
  return STARTER
    .map(([key, equipment, measure, muscle]) => ({ name: t.m.gym.starter[key], equipment, measure, muscle, incrementKg: DEFAULT_INCREMENT[equipment] }))
    .filter((e) => !have.has(e.name.toLocaleLowerCase()))
}
