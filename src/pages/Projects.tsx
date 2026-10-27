import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Flag, FolderKanban, Kanban, Link2, List, ListChecks,
  MessageSquarePlus, OctagonAlert, Pencil, Pin, PinOff, Plus, Target, Timer, Trash2, X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AreaPicker } from '../components/AreaPicker'
import { EmojiInput } from '../components/EmojiInput'
import { LinkedNotes } from '../components/NoteEditor'
import { QuickAdd } from '../components/QuickAdd'
import { TaskEditor } from '../components/TaskEditor'
import { TaskItem } from '../components/TaskItem'
import { usePageAction } from '../components/Shell'
import { AreaChip, Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, ProgressBar, ProgressRing, Segmented, SectionTitle, Select, Textarea } from '../components/ui'
import { useI18n } from '../i18n/react'
import type { I18n } from '../i18n/core'
import { celebrate } from '../lib/celebrate'
import { announceCounted } from '../lib/dayStart'
import { diffDays } from '../lib/date'
import { areaHex, useAreaMap, useData, useToday } from '../lib/hooks'
import { uid } from '../lib/id'
import { boardColumns, nextAction, projectPace, projectStats, type ProjectPace } from '../lib/projects'
import { navigate, useRouteParam } from '../lib/router'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { PROJECT_STATUSES, type Project, type ProjectStatus, type Task, type TaskStage } from '../lib/types'
import { openAchievement } from './Achievements'

export { projectStats }

const STATUS_CLS: Record<ProjectStatus, string> = {
  planning: 'bg-violet-500/10 text-violet-500',
  active: 'bg-accent-soft text-accent',
  'on-hold': 'bg-amber-500/10 text-amber-500',
  done: 'bg-sky-500/10 text-sky-500',
  archived: 'bg-surface-2 text-muted',
}

const PACE_CLS: Record<Exclude<ProjectPace, 'none'>, string> = {
  ahead: 'bg-accent-soft text-accent',
  'on-track': 'bg-sky-500/10 text-sky-500',
  behind: 'bg-amber-500/10 text-amber-500',
  overdue: 'bg-danger/10 text-danger',
}

function dueText(due: string | null, today: string, t: I18n): { text: string; late: boolean } | null {
  if (!due) return null
  const n = diffDays(due, today)
  const L = t.m.projects
  return { text: n === 0 ? L.dueToday : n > 0 ? t.p(L.daysLeft, n) : t.p(L.daysLate, -n), late: n < 0 }
}

export function ProjectsPage() {
  const id = useRouteParam()
  return id ? <ProjectDetail id={id} /> : <ProjectList />
}

// --- list -----------------------------------------------------------------------------

type Filter = 'current' | 'on-hold' | 'done' | 'archived'

function ProjectList() {
  const t = useI18n()
  const L = t.m.projects
  const d = useData()
  const today = useToday()
  const areas = useAreaMap()
  const [filter, setFilter] = useState<Filter>('current')
  const [creating, setCreating] = useState(false)
  usePageAction({ label: L.newProject, icon: <FolderKanban size={24} />, run: () => setCreating(true) })

  const inFilter = (p: Project, f: Filter) => (f === 'current' ? p.status === 'active' || p.status === 'planning' : p.status === f)
  const list = d.projects.filter((p) => inFilter(p, filter))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.updatedAt.localeCompare(a.updatedAt))
  const count = (f: Filter) => d.projects.filter((p) => inFilter(p, f)).length

  return (
    <div>
      <PageHeader
        title={t.m.nav.projects}
        subtitle={d.projects.length ? t.f(L.subtitleCount, { n: count('current') }) : L.subtitleEmpty}
        right={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={16} /> {L.newProject}</Button>}
      />
      {d.projects.length > 0 && (
        <Segmented
          className="mb-5"
          value={filter}
          onChange={setFilter}
          options={(['current', 'on-hold', 'done', 'archived'] as const).map((f) => ({ value: f, label: t.f(L.filterCount, { label: L.filter[f], n: count(f) }) }))}
        />
      )}
      {d.projects.length === 0 ? (
        <EmptyState emoji="🚀" title={L.emptyTitle}>{L.emptyBody}</EmptyState>
      ) : list.length === 0 ? (
        <EmptyState emoji="🗂️" title={L.filteredEmpty} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const st = projectStats(p, d)
            const pace = projectPace(p, st.progress, today)
            const next = p.status === 'done' ? null : nextAction(p, d.tasks)
            const area = p.areaId ? areas.get(p.areaId) : undefined
            const hex = areaHex(area)
            const due = dueText(p.status === 'done' ? null : p.dueDate, today, t)
            return (
              <motion.button key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={() => navigate('projects', p.id)} className="text-start">
                <Card className="relative flex h-full flex-col overflow-hidden p-5 transition hover:border-text/20">
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: hex }} />
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${hex}1f` }}>{p.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold', STATUS_CLS[p.status])}>{L.status[p.status]}</span>
                        {pace.pace !== 'none' && <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold', PACE_CLS[pace.pace])}>{L.pace[pace.pace]}</span>}
                        <AreaChip area={area} />
                      </div>
                      <h3 className="mt-1 text-lg font-bold leading-tight">{p.title}</h3>
                    </div>
                    {p.pinned && <Pin size={15} className="shrink-0 text-accent" />}
                  </div>
                  {p.description && <p className="mt-3 line-clamp-2 text-sm text-muted">{p.description}</p>}
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-muted">
                      <span>{p.progressMode === 'manual' ? L.progressByHand : st.total ? t.p(st.doing ? L.tasksProgressDoing : L.tasksProgress, st.total, { done: st.done, doing: st.doing }) : L.noTasksYet}</span>
                      <span className="font-bold tabular" style={{ color: hex }}>{t.pct(st.progress)}</span>
                    </div>
                    <ProgressBar value={st.progress} color={hex} />
                  </div>
                  {next && <p className="mt-3 truncate text-xs"><span className="font-semibold text-muted">{L.nextLabel} </span>{next.title}</p>}
                  {(due || st.focusMin > 0 || st.blocked > 0) && (
                    <div className="mt-auto flex flex-wrap gap-x-3 pt-3 text-xs text-muted">
                      {due && <span className={cx('inline-flex items-center gap-1', due.late && 'font-semibold text-danger')}><CalendarDays size={12} />{due.text}</span>}
                      {st.blocked > 0 && <span className="inline-flex items-center gap-1 font-semibold text-danger"><OctagonAlert size={12} />{t.f(L.blocked, { n: st.blocked })}</span>}
                      {st.focusMin > 0 && <span className="inline-flex items-center gap-1"><Timer size={12} />{t.dur(st.focusMin)}</span>}
                    </div>
                  )}
                </Card>
              </motion.button>
            )
          })}
        </div>
      )}
      <ProjectEditor open={creating} onClose={() => setCreating(false)} onCreated={(id) => navigate('projects', id)} />
    </div>
  )
}

// --- detail ---------------------------------------------------------------------------

function ProjectDetail({ id }: { id: string }) {
  const t = useI18n()
  const L = t.m.projects
  const d = useData()
  const today = useToday()
  const areas = useAreaMap()
  const update = useStore((s) => s.updateProject)
  const remove = useStore((s) => s.deleteProject)
  const [editing, setEditing] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const project = d.projects.find((p) => p.id === id)
  usePageAction(project ? { label: t.m.nav.newTask, run: () => setAddingTask(true) } : null)

  if (!project) {
    return (
      <div>
        <button onClick={() => navigate('projects')} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} className="rtl:-scale-x-100" /> {t.m.nav.projects}</button>
        <EmptyState emoji="🔍" title={L.notFound}>{L.notFoundBody}</EmptyState>
      </div>
    )
  }

  const p = project
  const st = projectStats(p, d)
  const pace = projectPace(p, st.progress, today)
  const next = p.status === 'done' ? null : nextAction(p, d.tasks)
  const area = p.areaId ? areas.get(p.areaId) : undefined
  const hex = areaHex(area)
  const goal = p.goalId ? d.goals.find((g) => g.id === p.goalId) : undefined
  const due = dueText(p.status === 'done' ? null : p.dueDate, today, t)
  const tasks = d.tasks.filter((x) => x.projectId === p.id)
  const cols = boardColumns(tasks)
  const open = [...cols.doing, ...cols.todo]

  const setStatus = (status: ProjectStatus) => {
    update(p.id, { status })
    if (status === 'done') {
      celebrate.goal()
      toast({
        emoji: '🎉', message: t.f(L.completeToast, { title: p.title }),
        action: {
          label: L.addToAchievements,
          run: () => openAchievement({ title: t.f(t.m.achievements.finished, { title: p.title }), story: p.description, date: today, category: 'projects', emoji: p.emoji || '🚀', impact: 2, projectId: p.id, goalId: p.goalId, source: `project:${p.id}` }),
        },
      }, 10000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('projects')} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} className="rtl:-scale-x-100" /> {t.m.nav.projects}</button>
        <div className="flex gap-1">
          <IconButton label={p.pinned ? L.unpinFromToday : L.pinToToday} onClick={() => { update(p.id, { pinned: !p.pinned }); toast({ emoji: '📌', message: p.pinned ? L.unpinnedToast : L.pinnedToast }) }} className={p.pinned ? 'text-accent' : ''}>
            {p.pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </IconButton>
          <IconButton label={L.editProject} onClick={() => setEditing(true)}><Pencil size={16} /></IconButton>
          <IconButton label={L.deleteProject} className="hover:text-danger" onClick={() => {
            if (confirm(tasks.length ? t.p(L.deleteConfirm, tasks.length, { title: p.title }) : t.f(L.deleteConfirmEmpty, { title: p.title }))) { remove(p.id); navigate('projects') }
          }}><Trash2 size={16} /></IconButton>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl text-4xl sm:size-16" style={{ background: `${hex}1f` }}>{p.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select value={p.status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} aria-label={t.m.common.status}
                className={cx('cursor-pointer appearance-none rounded-lg py-1 ps-2 pe-6 text-xs font-bold outline-none', STATUS_CLS[p.status])}>
                {PROJECT_STATUSES.map((k) => <option key={k} value={k}>{L.status[k]}</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute end-1.5 top-1/2 -translate-y-1/2 opacity-70" />
            </div>
            {pace.pace !== 'none' && <span className={cx('rounded-lg px-2 py-1 text-xs font-bold', PACE_CLS[pace.pace])}>{L.pace[pace.pace]}</span>}
            <AreaChip area={area} />
            {goal && <button onClick={() => navigate('goals')} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-accent"><Target size={12} /> {goal.title}</button>}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{p.title}</h1>
          {p.description && <p className="mt-1 max-w-2xl text-sm text-muted">{p.description}</p>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <ProgressPanel p={p} progress={st.progress} hex={hex} done={st.done} total={st.total} expected={pace.pace !== 'none' ? pace.expected : null} />
        <div className="grid grid-cols-3 gap-3 md:contents">
          <Stat value={due ? due.text : '—'} label={p.dueDate ? t.f(L.dueOn, { date: t.d(p.dueDate, 'short') }) : L.noDeadline} danger={due?.late} />
          <Stat value={t.dur(st.focusMin)} label={L.focused} />
          <Stat value={st.estimateMin ? t.dur(st.estimateMin) : '—'} label={L.estimatedLeft} />
        </div>
      </div>

      {next && (
        <Card className="flex items-center gap-3 border-accent/30 p-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><ArrowRightIcon /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{L.nextAction}</div>
            <div className="truncate font-semibold">{next.title}</div>
          </div>
          {next.stage !== 'doing' && <Button size="sm" onClick={() => useStore.getState().setTaskStage(next.id, 'doing')}>{L.startAction}</Button>}
          <Button size="sm" variant="primary" onClick={() => { if (useStore.getState().setTaskStage(next.id, 'done')) { celebrate.tick(); announceCounted() } }}><Check size={14} /> {t.m.common.done}</Button>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle className="mb-0">{t.p(st.blocked ? L.tasksHeadingBlocked : L.tasksHeading, open.length, { blocked: st.blocked })}</SectionTitle>
          <Segmented
            value={p.view}
            onChange={(v) => update(p.id, { view: v })}
            options={[{ value: 'list', label: <span className="inline-flex items-center gap-1"><List size={13} /> {L.view.list}</span> }, { value: 'board', label: <span className="inline-flex items-center gap-1"><Kanban size={13} /> {L.view.board}</span> }]}
          />
        </div>

        {p.view === 'board' ? <Board p={p} tasks={tasks} /> : (
          <>
            <QuickAdd defaultDate={null} defaultProjectId={p.id} defaultAreaId={p.areaId} placeholder={L.addTaskPlaceholder} />
            {tasks.length === 0 ? (
              <EmptyState emoji="🧩" title={L.breakItDown}>{L.breakItDownBody}</EmptyState>
            ) : (
              <Card className="p-2">
                {open.length === 0 && <p className="px-3 py-4 text-sm text-muted">{L.allTasksDone}</p>}
                <AnimatePresence initial={false}>
                  {open.map((x) => <TaskItem key={x.id} task={x} showDate hideProject />)}
                </AnimatePresence>
              </Card>
            )}
            {cols.done.length > 0 && (
              <div>
                <button onClick={() => setShowDone((s) => !s)} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted hover:text-text">
                  <ChevronDown size={14} className={cx('transition', !showDone && '-rotate-90 rtl:rotate-90')} /> {t.f(L.doneHeading, { n: cols.done.length })}
                </button>
                {showDone && <Card className="mt-2 p-2">{cols.done.map((x) => <TaskItem key={x.id} task={x} hideProject />)}</Card>}
              </div>
            )}
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionTitle>{L.updatesActivity}</SectionTitle>
          <Activity p={p} tasks={tasks} />
        </section>
        <aside className="space-y-6">
          <section>
            <SectionTitle>{t.m.common.notes}</SectionTitle>
            <NotesBox key={p.id} value={p.notes} onSave={(notes) => update(p.id, { notes })} />
            <div className="mt-3"><LinkedNotes projectId={p.id} areaId={p.areaId} /></div>
          </section>
          <section>
            <SectionTitle>{L.links}</SectionTitle>
            <Links project={p} />
          </section>
        </aside>
      </div>

      <ProjectEditor open={editing} onClose={() => setEditing(false)} project={p} />
      <TaskEditor open={addingTask} onClose={() => setAddingTask(false)} defaults={{ projectId: p.id, areaId: p.areaId, date: null }} />
    </div>
  )
}

function ArrowRightIcon() {
  return <ChevronRight size={18} className="rtl:-scale-x-100" />
}

function Stat({ value, label, danger }: { value: string; label: string; danger?: boolean }) {
  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <div className={cx('truncate text-base font-bold tabular sm:text-lg', danger && 'text-danger')}>{value}</div>
      <div className="truncate text-xs text-muted">{label}</div>
    </Card>
  )
}

// --- progress ---------------------------------------------------------------------------

function ProgressPanel({ p, progress, hex, done, total, expected }: { p: Project; progress: number; hex: string; done: number; total: number; expected: number | null }) {
  const t = useI18n()
  const L = t.m.projects.progress
  const update = useStore((s) => s.updateProject)
  const setProgress = useStore((s) => s.setProjectProgress)
  const [draft, setDraft] = useState(p.manualProgress)
  useEffect(() => setDraft(p.manualProgress), [p.manualProgress])
  const manual = p.progressMode === 'manual'

  const commit = (v: number) => {
    const before = p.manualProgress
    setProgress(p.id, v)
    if (v >= 100 && before < 100) { celebrate.goal(); toast({ emoji: '🏁', message: L.reachedHundred }) }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <ProgressRing value={manual ? draft / 100 : progress} size={64} stroke={7} color={hex}>
          <span className="text-sm font-extrabold tabular">{t.pct(manual ? draft / 100 : progress)}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <Segmented
            value={p.progressMode}
            onChange={(v) => update(p.id, { progressMode: v })}
            options={[{ value: 'tasks', label: L.fromTasks }, { value: 'manual', label: L.manual }]}
          />
          <div className="mt-1.5 text-xs text-muted">
            {(() => {
              const status = manual ? L.dragToSet : total ? t.p(L.tasksDoneOf, total, { done }) : L.addTasksOrManual
              return expected !== null ? t.f(L.timePassed, { status, pct: t.pct(expected) }) : status
            })()}
          </div>
        </div>
      </div>
      {manual && (
        <div className="mt-3 space-y-2">
          <input
            type="range" min={0} max={100} step={5} value={draft}
            onChange={(e) => setDraft(Number(e.target.value))}
            onPointerUp={() => commit(draft)} onKeyUp={() => commit(draft)} onBlur={() => draft !== p.manualProgress && commit(draft)}
            className="w-full accent-[var(--accent)]"
            aria-label={L.sliderLabel}
          />
          <div className="flex flex-wrap gap-1.5">
            {[10, 25].map((n) => (
              <button key={n} onClick={() => commit(Math.min(100, p.manualProgress + n))} dir="ltr" className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted hover:text-text">{t.f(L.plusPct, { pct: t.pct(n / 100) })}</button>
            ))}
            <button onClick={() => commit(100)} className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted hover:text-text">{t.pct(1)}</button>
          </div>
        </div>
      )}
    </Card>
  )
}

// --- board ------------------------------------------------------------------------------

const COLUMNS: { stage: TaskStage | 'done'; dot: string }[] = [
  { stage: 'todo', dot: '#94a3b8' },
  { stage: 'doing', dot: '#0ea5e9' },
  { stage: 'done', dot: '#10b981' },
]

function Board({ p, tasks }: { p: Project; tasks: Task[] }) {
  const t = useI18n()
  const L = t.m.projects.board
  const setStage = useStore((s) => s.setTaskStage)
  const cols = boardColumns(tasks)
  const [over, setOver] = useState<string | null>(null)

  const move = (id: string, stage: TaskStage | 'done') => {
    if (setStage(id, stage)) { celebrate.tick(); announceCounted() }
  }

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
      {COLUMNS.map((c, ci) => {
        const items = cols[c.stage]
        return (
          <div
            key={c.stage}
            onDragOver={(e) => { e.preventDefault(); setOver(c.stage) }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/board-task'); if (id) move(id, c.stage) }}
            className={cx('flex w-[82%] shrink-0 snap-start flex-col rounded-2xl border border-dashed p-2 transition md:w-auto', over === c.stage ? 'border-accent bg-accent-soft' : 'border-transparent bg-surface-2/50')}
          >
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <span className="inline-flex items-center gap-2 text-sm font-bold">
                <span className="size-2 rounded-full" style={{ background: c.dot }} /> {L[c.stage]} <span className="text-muted">· {t.n(items.length)}</span>
              </span>
            </div>
            {c.stage !== 'done' && (
              <QuickAdd
                defaultDate={null} defaultProjectId={p.id} defaultAreaId={p.areaId} defaultStage={c.stage}
                placeholder={L.addCard} className="mb-2 border-dashed bg-surface/60 [&_input]:h-9 sm:[&_input]:text-sm"
              />
            )}
            <div className="flex min-h-16 flex-col gap-2">
              <AnimatePresence initial={false}>
                {items.map((x) => (
                  <BoardCard
                    key={x.id} task={x}
                    onLeft={ci > 0 ? () => move(x.id, COLUMNS[ci - 1].stage) : undefined}
                    onRight={ci < COLUMNS.length - 1 ? () => move(x.id, COLUMNS[ci + 1].stage) : undefined}
                  />
                ))}
              </AnimatePresence>
              {items.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted">{c.stage === 'done' ? L.doneEmpty : L.empty}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const PRIORITY_COLOR = ['', '#0ea5e9', '#f59e0b', '#f43f5e']

function BoardCard({ task, onLeft, onRight }: { task: Task; onLeft?: () => void; onRight?: () => void }) {
  const t = useI18n()
  const L = t.m.projects.board
  const toggleBlocked = useStore((s) => s.toggleTaskBlocked)
  const [editing, setEditing] = useState(false)
  const subDone = task.subtasks.filter((x) => x.done).length
  const today = useToday()
  const late = !task.done && task.date && task.date < today

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/board-task', task.id)}
        onClick={() => setEditing(true)}
        className={cx('group cursor-pointer rounded-xl border bg-surface p-3 shadow-sm transition hover:border-text/20 active:cursor-grabbing', task.blocked ? 'border-danger/50' : 'border-border')}
      >
        <div className={cx('text-sm font-semibold leading-snug', task.done && 'text-muted line-through')}>{task.title}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          {task.blocked && <span className="inline-flex items-center gap-0.5 font-bold text-danger"><OctagonAlert size={11} /> {L.blocked}</span>}
          {task.priority > 0 && <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: PRIORITY_COLOR[task.priority] }}><Flag size={10} fill="currentColor" />{t.f(L.priority, { n: task.priority })}</span>}
          {task.date && <span className={cx('inline-flex items-center gap-0.5', late && 'font-semibold text-danger')}><CalendarDays size={10} />{t.d(task.date, 'short')}</span>}
          {task.estimateMin && <span className="inline-flex items-center gap-0.5"><Timer size={10} />{t.dur(task.estimateMin)}</span>}
          {task.subtasks.length > 0 && <span className="inline-flex items-center gap-0.5"><ListChecks size={10} />{t.n(subDone)}/{t.n(task.subtasks.length)}</span>}
        </div>
        <div className="mt-2 flex items-center gap-1 border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
          <IconButton label={L.movePrev} disabled={!onLeft} onClick={onLeft} className="size-7 disabled:opacity-25"><ChevronLeft size={15} className="rtl:-scale-x-100" /></IconButton>
          <IconButton label={L.moveNext} disabled={!onRight} onClick={onRight} className="size-7 disabled:opacity-25"><ChevronRight size={15} className="rtl:-scale-x-100" /></IconButton>
          {!task.done && (
            <button onClick={() => toggleBlocked(task.id)} className={cx('ms-auto rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition', task.blocked ? 'bg-danger/10 text-danger' : 'text-muted hover:bg-surface-2')}>
              {task.blocked ? L.unblock : L.blockedQuestion}
            </button>
          )}
        </div>
      </div>
      <TaskEditor open={editing} onClose={() => setEditing(false)} task={task} />
    </motion.div>
  )
}

// --- updates & activity -------------------------------------------------------------------

type ActivityItem =
  | { kind: 'update'; at: string; id: string; text: string; progress: number | null }
  | { kind: 'done'; at: string; id: string; text: string }
  | { kind: 'created'; at: string; id: string }

function Activity({ p, tasks }: { p: Project; tasks: Task[] }) {
  const t = useI18n()
  const L = t.m.projects.activity
  const updates = useStore((s) => s.projectUpdates)
  const addUpdate = useStore((s) => s.addProjectUpdate)
  const deleteUpdate = useStore((s) => s.deleteProjectUpdate)
  const [text, setText] = useState('')
  const [withProgress, setWithProgress] = useState(false)
  const [progress, setProgress] = useState(p.manualProgress)
  const [showAll, setShowAll] = useState(false)

  const items = useMemo<ActivityItem[]>(() => [
    ...updates.filter((u) => u.projectId === p.id).map((u) => ({ kind: 'update' as const, at: u.createdAt, id: u.id, text: u.text, progress: u.progress })),
    ...tasks.filter((x) => x.done && x.doneAt).map((x) => ({ kind: 'done' as const, at: x.doneAt!, id: x.id, text: x.title })),
    { kind: 'created' as const, at: p.createdAt, id: 'created' },
  ].sort((a, b) => b.at.localeCompare(a.at)), [updates, tasks, p.id, p.createdAt])

  const post = () => {
    if (!text.trim() && !withProgress) return
    addUpdate({ projectId: p.id, text: text.trim(), progress: withProgress ? progress : null })
    setText(''); setWithProgress(false)
    toast({ emoji: '📣', message: L.posted })
  }

  const shown = showAll ? items : items.slice(0, 8)

  return (
    <div className="space-y-3">
      <Card className="space-y-2 p-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={L.placeholder} className="min-h-16" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted">
            <input type="checkbox" checked={withProgress} onChange={(e) => { setWithProgress(e.target.checked); setProgress(p.manualProgress) }} className="accent-[var(--accent)]" />
            {L.setProgress}
          </label>
          {withProgress && (
            <div className="flex min-w-40 flex-1 items-center gap-2">
              <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" aria-label={L.sliderLabel} />
              <span className="w-10 text-end text-xs font-bold tabular">{t.pct(progress / 100)}</span>
            </div>
          )}
          <Button size="sm" variant="primary" className="ms-auto" onClick={post} disabled={!text.trim() && !withProgress}><MessageSquarePlus size={14} /> {L.post}</Button>
        </div>
      </Card>
      <Card className="p-2">
        <ol>
          {shown.map((i) => (
            <li key={`${i.kind}-${i.id}`} className="group flex gap-3 rounded-xl p-2.5 hover:bg-surface-2/50">
              <span className={cx('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs',
                i.kind === 'update' ? 'bg-accent-soft text-accent' : i.kind === 'done' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-2 text-muted')}>
                {i.kind === 'update' ? '📣' : i.kind === 'done' ? <Check size={13} strokeWidth={3} /> : '🚀'}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                {i.kind === 'update' && (
                  <>
                    {i.text && <p className="whitespace-pre-line">{i.text}</p>}
                    {i.progress !== null && <p className="text-xs font-semibold text-accent">{t.f(L.progressTo, { pct: t.pct(i.progress / 100) })}</p>}
                  </>
                )}
                {i.kind === 'done' && <p><span className="text-muted">{L.taskDone}</span> {i.text}</p>}
                {i.kind === 'created' && <p className="text-muted">{L.started}</p>}
                <p className="text-[11px] text-muted">{t.ago(i.at)}</p>
              </div>
              {i.kind === 'update' && (
                <IconButton label={L.deleteUpdate} className="hover:text-danger sm:opacity-0 sm:group-hover:opacity-100" onClick={() => deleteUpdate(i.id)}><Trash2 size={13} /></IconButton>
              )}
            </li>
          ))}
        </ol>
        {items.length > 8 && (
          <button onClick={() => setShowAll((s) => !s)} className="w-full py-2 text-xs font-semibold text-accent">{showAll ? L.showLess : t.f(L.showAll, { n: items.length })}</button>
        )}
      </Card>
    </div>
  )
}

// --- notes & links ------------------------------------------------------------------------

/** Saves when you stop typing — notes are the place for thinking, not forms. */
function NotesBox({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const t = useI18n()
  const [text, setText] = useState(value)
  useEffect(() => {
    if (text === value) return
    const timer = setTimeout(() => onSave(text), 600)
    return () => clearTimeout(timer)
  }, [text, value, onSave])
  return (
    <Card className="p-1">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== value && onSave(text)}
        placeholder={t.m.projects.notesPlaceholder}
        className="min-h-40 w-full resize-y rounded-xl bg-transparent p-3 text-base leading-relaxed outline-none placeholder:text-muted/70 sm:text-sm"
      />
    </Card>
  )
}

function Links({ project: p }: { project: Project }) {
  const t = useI18n()
  const L = t.m.projects.link
  const update = useStore((s) => s.updateProject)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const add = () => {
    const u = url.trim()
    if (!u) return
    const href = /^[a-z]+:\/\//i.test(u) ? u : `https://${u}`
    update(p.id, { links: [...p.links, { id: uid(), label: label.trim() || u.replace(/^https?:\/\//, ''), url: href }] })
    setLabel(''); setUrl('')
  }

  return (
    <Card className="space-y-2 p-3">
      {p.links.map((l) => (
        <div key={l.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2/60">
          <Link2 size={14} className="shrink-0 text-muted" />
          <a href={l.url} dir="ltr" target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-accent">{l.label}</a>
          <ExternalLink size={12} className="shrink-0 text-muted" />
          <button aria-label={L.remove} onClick={() => update(p.id, { links: p.links.filter((x) => x.id !== l.id) })} className="text-muted hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <Input placeholder={L.label} value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input dir="ltr" placeholder={L.urlPlaceholder} value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} disabled={!url.trim()}><Plus size={15} /></Button>
      </div>
    </Card>
  )
}

// --- editor -------------------------------------------------------------------------------

type Draft = Pick<Project, 'title' | 'emoji' | 'description' | 'areaId' | 'goalId' | 'status' | 'startDate' | 'dueDate' | 'progressMode' | 'pinned'>

export function ProjectEditor({ open, onClose, project, defaults, onCreated }: {
  open: boolean
  onClose: () => void
  project?: Project
  defaults?: Partial<Draft>
  onCreated?: (id: string) => void
}) {
  const t = useI18n()
  const L = t.m.projects.editor
  const today = useToday()
  const goals = useStore((s) => s.goals)
  const add = useStore((s) => s.addProject)
  const update = useStore((s) => s.updateProject)
  const blank = useMemo<Draft>(() => ({ title: '', emoji: '🚀', description: '', areaId: null, goalId: null, status: 'active', startDate: today, dueDate: null, progressMode: 'tasks', pinned: false }), [today])
  const [d, setD] = useState<Draft>(blank)
  useEffect(() => { if (open) setD(project ? { ...project } : { ...blank, ...defaults }) /* eslint-disable-next-line */ }, [open])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = () => {
    if (!d.title.trim()) return
    if (project) { update(project.id, { ...d, title: d.title.trim() }); onClose(); return }
    const id = add({ ...d, title: d.title.trim() })
    onClose()
    // Open the new project after the dialog has started closing, so the two never race.
    if (onCreated) setTimeout(() => onCreated(id), 0)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? L.edit : L.create}
      footer={<><Button variant="ghost" onClick={onClose}>{t.m.common.cancel}</Button><Button variant="primary" onClick={save} disabled={!d.title.trim()}>{project ? t.m.common.save : L.createButton}</Button></>}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={d.emoji} onChange={(v) => set('emoji', v)} />
          <Input autoFocus placeholder={L.namePlaceholder} value={d.title} onChange={(e) => set('title', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} className="h-10 font-semibold" />
        </div>
        <div><Label>{L.description}</Label><Textarea value={d.description} onChange={(e) => set('description', e.target.value)} className="min-h-20" /></div>
        <div><Label>{t.m.common.area}</Label><AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} /></div>
        <div>
          <Label>{t.m.common.status}</Label>
          <Segmented value={d.status} onChange={(v) => set('status', v)} options={PROJECT_STATUSES.map((k) => ({ value: k, label: t.m.projects.status[k] }))} />
        </div>
        <div>
          <Label>{L.progress}</Label>
          <Segmented value={d.progressMode} onChange={(v) => set('progressMode', v)} options={[{ value: 'tasks', label: L.modeTasks }, { value: 'manual', label: L.modeManual }]} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>{L.start}</Label><Input type="date" value={d.startDate ?? ''} onChange={(e) => set('startDate', e.target.value || null)} /></div>
          <div><Label hint={t.m.common.optional}>{L.deadline}</Label><Input type="date" value={d.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || null)} /></div>
        </div>
        {goals.length > 0 && (
          <div>
            <Label hint={t.m.common.optional}>{L.servesGoal}</Label>
            <Select value={d.goalId ?? ''} onChange={(e) => set('goalId', e.target.value || null)}>
              <option value="">{t.m.common.noGoal}</option>
              {goals.filter((g) => g.status !== 'done' || g.id === d.goalId).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </Select>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={d.pinned} onChange={(e) => set('pinned', e.target.checked)} className="accent-[var(--accent)]" />
          <Pin size={14} className="text-accent" /> {t.m.projects.pinToToday}
        </label>
      </div>
    </Modal>
  )
}
