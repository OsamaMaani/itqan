import { ChevronDown, ChevronRight, Plus, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/react'
import { toast } from '../../lib/toast'
import { useStore } from '../../lib/store'
import { starterExercises } from '../../lib/trainingStarter'
import { MUSCLES, type Exercise, type ID, type Muscle } from '../../lib/types'
import { Button, Card, cx, EmptyState, Input, Modal, SectionTitle } from '../ui'
import { ExerciseEditor } from './ExerciseEditor'
import { ExerciseHistory } from './ExerciseHistory'
import { useTrainingData } from './useTrainingData'

/** Every exercise, grouped by muscle: open one for its history, edit it, or archive it. */
export function ExercisesTab() {
  const t = useI18n()
  const { m } = t
  const { exercises, workoutSets } = useTrainingData()
  const add = useStore((s) => s.addExercise)
  const update = useStore((s) => s.updateExercise)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)
  const [viewing, setViewing] = useState<ID | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const withHistory = useMemo(() => new Set(workoutSets.map((s) => s.exerciseId)), [workoutSets])
  const q = query.trim().toLocaleLowerCase(t.locale)
  const matches = useMemo(
    () => exercises
      .filter((e) => !q || e.name.toLocaleLowerCase(t.locale).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, t.locale)),
    [exercises, q, t.locale],
  )
  const live = matches.filter((e) => !e.archived)
  const archived = matches.filter((e) => e.archived)
  const groups: { key: string; label: string; items: Exercise[] }[] = [
    ...MUSCLES.map((x: Muscle) => ({ key: x, label: m.gym.muscle[x], items: live.filter((e) => e.muscle === x) })),
    { key: 'other', label: m.common.other, items: live.filter((e) => !e.muscle) },
  ].filter((g) => g.items.length)

  const addCommon = () => {
    const missing = starterExercises(exercises, t)
    if (!missing.length) {
      toast({ emoji: '✅', message: m.training.exercises.haveAll })
      return
    }
    for (const e of missing) add(e)
    toast({ emoji: '✨', message: t.p(m.training.exercises.added, missing.length) })
  }

  const open = (e: Exercise) => (withHistory.has(e.id) ? setViewing(e.id) : setEditing(e))
  const viewed = viewing ? exercises.find((e) => e.id === viewing) : undefined

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-48">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="ps-9"
            type="search"
            placeholder={m.training.exercises.search}
            aria-label={m.training.exercises.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="soft" onClick={addCommon}><Sparkles size={16} /> {m.training.exercises.addCommon}</Button>
        <Button variant="primary" onClick={() => setEditing('new')}><Plus size={16} /> {m.training.exercises.newExercise}</Button>
      </div>

      {exercises.length === 0 ? (
        <EmptyState emoji="💪" title={m.training.exercises.emptyTitle}>{m.training.exercises.emptyBody}</EmptyState>
      ) : matches.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{m.training.exercises.noMatch}</p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key}>
              <SectionTitle>{g.label}</SectionTitle>
              <Card className="divide-y divide-border">
                {g.items.map((e) => <Row key={e.id} exercise={e} onOpen={() => open(e)} />)}
              </Card>
            </div>
          ))}
          {archived.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                aria-expanded={showArchived}
                className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-muted hover:text-text"
              >
                <ChevronDown size={15} className={cx('transition', !showArchived && '-rotate-90 rtl:rotate-90')} />
                {t.f(m.training.exercises.archivedTitle, { n: archived.length })}
              </button>
              {showArchived && (
                <Card className="divide-y divide-border">
                  {archived.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 pe-3">
                      <div className="min-w-0 flex-1"><Row exercise={e} onOpen={() => open(e)} bare /></div>
                      <Button variant="soft" size="sm" onClick={() => update(e.id, { archived: false })}>{m.common.unarchive}</Button>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      <ExerciseEditor open={editing !== null} exercise={editing && editing !== 'new' ? editing : undefined} onClose={() => setEditing(null)} />

      <Modal
        open={!!viewed}
        onClose={() => setViewing(null)}
        wide
        title={viewed?.name ?? ''}
        footer={viewed && <Button variant="soft" onClick={() => { setViewing(null); setEditing(viewed) }}>{m.common.edit}</Button>}
      >
        {viewed && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {[m.gym.equipment[viewed.equipment], m.gym.measure[viewed.measure], viewed.muscle ? m.gym.muscle[viewed.muscle] : null].map(
                (label) => label && <span key={label} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">{label}</span>,
              )}
            </div>
            {viewed.notes && <p className="whitespace-pre-wrap rounded-xl bg-surface-2/60 px-3 py-2 text-sm">{viewed.notes}</p>}
            <ExerciseHistory exerciseId={viewed.id} />
          </div>
        )}
      </Modal>
    </div>
  )
}

function Row({ exercise: e, onOpen, bare }: { exercise: Exercise; onOpen: () => void; bare?: boolean }) {
  const { m } = useI18n()
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx('flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-surface-2/60', !bare && 'first:rounded-t-2xl last:rounded-b-2xl')}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{e.name}</span>
        <span className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">{m.gym.equipment[e.equipment]}</span>
          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">{m.gym.measure[e.measure]}</span>
        </span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted rtl:-scale-x-100" />
    </button>
  )
}
