import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../../lib/store'
import type { Routine } from '../../lib/types'

/** The Training collections, stable while none of them changes (ADR-027). */
export function useTrainingData() {
  return useStore(
    useShallow((s) => ({
      exercises: s.exercises,
      routines: s.routines,
      program: s.program,
      workouts: s.workouts,
      workoutSets: s.workoutSets,
      weekStartsOn: s.settings.weekStartsOn,
    })),
  )
}

/** Routines that are not archived, in the order the person arranged them. */
export function liveRoutines(routines: Routine[]): Routine[] {
  return routines.filter((r) => !r.archived).sort((a, b) => a.order - b.order)
}
