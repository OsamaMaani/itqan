import { addMonths, getDaysInMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/react'
import { addDaysKey, diffDays, fromKey, toKey, weekStartKey } from '../../lib/date'
import { useToday } from '../../lib/hooks'
import { trainingDays, workoutsOn } from '../../lib/training'
import type { DateKey, ID } from '../../lib/types'
import { Button, Card, cx, IconButton, SectionTitle, Select } from '../ui'
import { ExerciseHistory } from './ExerciseHistory'
import { useTrainingData } from './useTrainingData'
import { WorkoutDetails, WorkoutRow } from './WorkoutDetails'

/** Any day, any exercise: a calendar of training days, and one exercise's story over time. */
export function HistoryTab() {
  const t = useI18n()
  const { m } = t
  const today = useToday()
  const { exercises, workouts, workoutSets, weekStartsOn } = useTrainingData()
  const [month, setMonth] = useState<DateKey>(() => `${today.slice(0, 8)}01`)
  const [selected, setSelected] = useState<DateKey>(today)
  const [openId, setOpenId] = useState<ID | null>(null)
  const [exerciseId, setExerciseId] = useState('')

  const days = useMemo(() => trainingDays(workouts), [workouts])
  const onSelected = useMemo(() => workoutsOn(selected, workouts), [selected, workouts])

  const cells = useMemo(() => {
    const gridStart = weekStartKey(month, weekStartsOn)
    const rows = Math.ceil((diffDays(month, gridStart) + getDaysInMonth(fromKey(month))) / 7)
    return Array.from({ length: rows * 7 }, (_, i) => addDaysKey(gridStart, i))
  }, [month, weekStartsOn])
  const weekdayNames = useMemo(() => {
    const names = t.weekdays('short')
    return Array.from({ length: 7 }, (_, i) => names[(weekStartsOn + i) % 7])
  }, [t, weekStartsOn])
  const shift = (by: number) => setMonth(toKey(addMonths(fromKey(month), by)))
  const thisMonth = `${today.slice(0, 8)}01`

  const withHistory = useMemo(() => new Set(workoutSets.map((s) => s.exerciseId)), [workoutSets])
  const pickable = useMemo(
    () => exercises.filter((e) => !e.archived || withHistory.has(e.id)).sort((a, b) => a.name.localeCompare(b.name, t.locale)),
    [exercises, withHistory, t.locale],
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <IconButton label={m.training.history.prevMonth} onClick={() => shift(-1)}><ChevronLeft size={18} className="rtl:-scale-x-100" /></IconButton>
            <div className="flex items-center gap-2">
              <h2 className="font-bold">{t.d(month, 'month', true)}</h2>
              {(month !== thisMonth || selected !== today) && (
                <Button variant="ghost" size="sm" onClick={() => { setMonth(thisMonth); setSelected(today) }}>{m.time.today}</Button>
              )}
            </div>
            <IconButton label={m.training.history.nextMonth} onClick={() => shift(1)}><ChevronRight size={18} className="rtl:-scale-x-100" /></IconButton>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdayNames.map((n, i) => <div key={i} className="pb-1 text-[11px] font-semibold text-muted">{n}</div>)}
            {cells.map((k) => {
              const inMonth = k.slice(0, 7) === month.slice(0, 7)
              const trained = days.has(k)
              const isSel = k === selected
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelected(k)}
                  aria-label={t.d(k, 'long')}
                  aria-pressed={isSel}
                  className={cx(
                    'relative grid aspect-square place-items-center rounded-xl text-sm font-semibold tabular transition',
                    isSel ? 'bg-gradient-accent text-accent-fg' : 'hover:bg-surface-2',
                    !isSel && !inMonth && 'text-muted/50',
                    !isSel && k === today && 'ring-2 ring-accent/50',
                  )}
                >
                  {t.d(k, 'day')}
                  {trained && <span className={cx('absolute bottom-1 size-1.5 rounded-full', isSel ? 'bg-accent-fg' : 'bg-accent')} />}
                </button>
              )
            })}
          </div>
        </Card>

        <div>
          <SectionTitle>{t.d(selected, 'full', true)}</SectionTitle>
          {onSelected.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">{m.training.history.noWorkoutDay}</p>
          ) : (
            <Card className="divide-y divide-border p-1">
              {onSelected.map((w) => <WorkoutRow key={w.id} workout={w} sets={workoutSets} onOpen={setOpenId} />)}
            </Card>
          )}
        </div>
      </div>

      <div>
        <SectionTitle>{m.training.history.byExercise}</SectionTitle>
        <div className="mb-4 max-w-sm">
          <Select aria-label={m.training.history.pickExercise} value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            <option value="">{m.training.history.pickExercise}</option>
            {pickable.map((e) => (
              <option key={e.id} value={e.id}>{e.archived ? t.f(m.training.exercises.archivedName, { name: e.name }) : e.name}</option>
            ))}
          </Select>
        </div>
        {exerciseId && <ExerciseHistory exerciseId={exerciseId} onOpenWorkout={setOpenId} />}
      </div>

      <WorkoutDetails workoutId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
