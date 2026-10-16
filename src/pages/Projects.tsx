import { format } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, CalendarDays, ChevronDown, ExternalLink, Link2, Pencil, Plus, Target, Timer, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AreaPicker } from '../components/AreaPicker'
import { EmojiInput } from '../components/EmojiInput'
import { QuickAdd } from '../components/QuickAdd'
import { TaskItem } from '../components/TaskItem'
import { AreaChip, Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, ProgressBar, ProgressRing, Segmented, SectionTitle, Select, Textarea } from '../components/ui'
import { celebrate } from '../lib/celebrate'
import { diffDays, fromKey } from '../lib/date'
import { areaHex, useAreaMap, useData, useToday } from '../lib/hooks'
import { uid } from '../lib/id'
import { navigate, useRouteParam } from '../lib/router'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Data, Project, ProjectStatus } from '../lib/types'
import { fmtMin } from './Focus'

export const STATUS: Record<ProjectStatus, { label: string; cls: string }> = {
  planning: { label: 'Planning', cls: 'bg-violet-500/10 text-violet-500' },
  active: { label: 'Active', cls: 'bg-accent-soft text-accent' },
  'on-hold': { label: 'On hold', cls: 'bg-amber-500/10 text-amber-500' },
  done: { label: 'Done', cls: 'bg-sky-500/10 text-sky-500' },
  archived: { label: 'Archived', cls: 'bg-surface-2 text-muted' },
}

export interface ProjectStats { total: number; done: number; open: number; progress: number; focusMin: number; estimateMin: number }

export function projectStats(p: Project, d: Pick<Data, 'tasks' | 'focusSessions'>): ProjectStats {
  const tasks = d.tasks.filter((t) => t.projectId === p.id)
  const done = tasks.filter((t) => t.done).length
  const ids = new Set(tasks.map((t) => t.id))
  return {
    total: tasks.length,
    done,
    open: tasks.length - done,
    progress: p.status === 'done' ? 1 : tasks.length ? done / tasks.length : 0,
    focusMin: d.focusSessions.filter((f) => f.taskId && ids.has(f.taskId)).reduce((s, f) => s + f.minutes, 0),
    estimateMin: tasks.filter((t) => !t.done).reduce((s, t) => s + (t.estimateMin ?? 0), 0),
  }
}

function dueText(due: string | null, today: string): { text: string; late: boolean } | null {
  if (!due) return null
  const n = diffDays(due, today)
  return { text: n === 0 ? 'Due today' : n > 0 ? `${n} day${n === 1 ? '' : 's'} left` : `${-n} day${n === -1 ? '' : 's'} late`, late: n < 0 }
}

export function ProjectsPage() {
  const id = useRouteParam()
  return id ? <ProjectDetail id={id} /> : <ProjectList />
}

type Filter = 'current' | 'on-hold' | 'done' | 'archived'

function ProjectList() {
  const d = useData()
  const today = useToday()
  const areas = useAreaMap()
  const [filter, setFilter] = useState<Filter>('current')
  const [creating, setCreating] = useState(false)

  const matches = (p: Project) => (filter === 'current' ? p.status === 'active' || p.status === 'planning' : p.status === filter)
  const list = d.projects.filter(matches).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.updatedAt.localeCompare(a.updatedAt))
  const count = (f: Filter) => d.projects.filter((p) => (f === 'current' ? p.status === 'active' || p.status === 'planning' : p.status === f)).length

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={d.projects.length ? `${count('current')} in progress` : 'Bigger pieces of work, broken into tasks.'}
        right={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={16} /> New project</Button>}
      />
      {d.projects.length > 0 && (
        <Segmented
          className="mb-5"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'current', label: `In progress · ${count('current')}` },
            { value: 'on-hold', label: `On hold · ${count('on-hold')}` },
            { value: 'done', label: `Done · ${count('done')}` },
            { value: 'archived', label: `Archived · ${count('archived')}` },
          ]}
        />
      )}
      {d.projects.length === 0 ? (
        <EmptyState emoji="🚀" title="No projects yet">
          A project is anything with several steps: finishing a course, a portfolio site, moving house. Give it a deadline, then add its tasks.
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState emoji="🗂️" title="Nothing here" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const st = projectStats(p, d)
            const area = p.areaId ? areas.get(p.areaId) : undefined
            const hex = areaHex(area)
            const due = dueText(p.status === 'done' ? null : p.dueDate, today)
            return (
              <motion.button key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={() => navigate('projects', p.id)} className="text-left">
                <Card className="relative h-full overflow-hidden p-5 transition hover:border-text/20">
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: hex }} />
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${hex}1f` }}>{p.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold', STATUS[p.status].cls)}>{STATUS[p.status].label}</span>
                        <AreaChip area={area} />
                      </div>
                      <h3 className="mt-1 text-lg font-bold leading-tight">{p.title}</h3>
                    </div>
                  </div>
                  {p.description && <p className="mt-3 line-clamp-2 text-sm text-muted">{p.description}</p>}
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-muted">
                      <span>{st.total ? `${st.done}/${st.total} tasks` : 'No tasks yet'}</span>
                      <span className="font-bold tabular" style={{ color: hex }}>{Math.round(st.progress * 100)}%</span>
                    </div>
                    <ProgressBar value={st.progress} color={hex} />
                  </div>
                  {(due || st.focusMin > 0) && (
                    <div className="mt-3 flex flex-wrap gap-x-3 text-xs text-muted">
                      {due && <span className={cx('inline-flex items-center gap-1', due.late && 'font-semibold text-danger')}><CalendarDays size={12} />{due.text}</span>}
                      {st.focusMin > 0 && <span className="inline-flex items-center gap-1"><Timer size={12} />{fmtMin(st.focusMin)} focused</span>}
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

function ProjectDetail({ id }: { id: string }) {
  const d = useData()
  const today = useToday()
  const areas = useAreaMap()
  const update = useStore((s) => s.updateProject)
  const remove = useStore((s) => s.deleteProject)
  const [editing, setEditing] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const project = d.projects.find((p) => p.id === id)

  if (!project) {
    return (
      <div>
        <button onClick={() => navigate('projects')} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Projects</button>
        <EmptyState emoji="🔍" title="Project not found">It may have been deleted on another device.</EmptyState>
      </div>
    )
  }

  const p = project
  const st = projectStats(p, d)
  const area = p.areaId ? areas.get(p.areaId) : undefined
  const hex = areaHex(area)
  const goal = p.goalId ? d.goals.find((g) => g.id === p.goalId) : undefined
  const due = dueText(p.status === 'done' ? null : p.dueDate, today)
  const tasks = d.tasks.filter((t) => t.projectId === p.id)
  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || b.priority - a.priority || a.order - b.order)
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))

  const setStatus = (status: ProjectStatus) => {
    update(p.id, { status })
    if (status === 'done') { celebrate.goal(); toast({ emoji: '🎉', message: `Project complete: ${p.title}` }, 6000) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('projects')} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Projects</button>
        <div className="flex gap-1">
          <IconButton label="Edit project" onClick={() => setEditing(true)}><Pencil size={16} /></IconButton>
          <IconButton label="Delete project" className="hover:text-danger" onClick={() => {
            if (confirm(`Delete “${p.title}”? Its ${tasks.length} task(s) are kept, just without a project.`)) { remove(p.id); navigate('projects') }
          }}><Trash2 size={16} /></IconButton>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="grid size-14 shrink-0 sm:size-16 place-items-center rounded-2xl text-4xl" style={{ background: `${hex}1f` }}>{p.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={p.status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className={cx('cursor-pointer appearance-none rounded-lg py-1 pl-2 pr-6 text-xs font-bold outline-none', STATUS[p.status].cls)}
                aria-label="Status"
              >
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-70" />
            </div>
            <AreaChip area={area} />
            {goal && <button onClick={() => navigate('goals')} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-accent"><Target size={12} /> {goal.title}</button>}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{p.title}</h1>
          {p.description && <p className="mt-1 max-w-2xl text-sm text-muted">{p.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="col-span-2 flex items-center gap-4 p-4 md:col-span-1">
          <ProgressRing value={st.progress} size={60} stroke={7} color={hex}><span className="text-sm font-extrabold tabular">{Math.round(st.progress * 100)}%</span></ProgressRing>
          <div><div className="text-lg font-bold tabular">{st.done}/{st.total}</div><div className="text-xs text-muted">tasks done</div></div>
        </Card>
        <Stat value={due ? due.text : p.dueDate ? format(fromKey(p.dueDate), 'MMM d') : '—'} label={p.dueDate ? `due ${format(fromKey(p.dueDate), 'MMM d, yyyy')}` : 'no deadline'} danger={due?.late} />
        <Stat value={fmtMin(st.focusMin)} label="focused on it" />
        <Stat value={st.estimateMin ? fmtMin(st.estimateMin) : '—'} label="estimated left" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-3">
          <SectionTitle>Tasks · {open.length} open</SectionTitle>
          <QuickAdd defaultDate={null} defaultProjectId={p.id} defaultAreaId={p.areaId} placeholder="Add a task…  (add “today” or a day to schedule it)" />
          {open.length === 0 && done.length === 0 ? (
            <EmptyState emoji="🧩" title="Break it down">What is the very first step? Add it above — “today” or “friday” schedules it.</EmptyState>
          ) : (
            <Card className="p-2">
              {open.length === 0 && <p className="px-3 py-4 text-sm text-muted">All tasks done. Mark the project done, or add the next step.</p>}
              <AnimatePresence initial={false}>
                {open.map((t) => <TaskItem key={t.id} task={t} showDate hideProject />)}
              </AnimatePresence>
            </Card>
          )}
          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone((s) => !s)} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted hover:text-text">
                <ChevronDown size={14} className={cx('transition', !showDone && '-rotate-90')} /> Done · {done.length}
              </button>
              {showDone && <Card className="mt-2 p-2">{done.map((t) => <TaskItem key={t.id} task={t} hideProject />)}</Card>}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section>
            <SectionTitle>Notes</SectionTitle>
            <NotesBox key={p.id} value={p.notes} onSave={(notes) => update(p.id, { notes })} />
          </section>
          <section>
            <SectionTitle>Links</SectionTitle>
            <Links project={p} />
          </section>
        </aside>
      </div>

      <ProjectEditor open={editing} onClose={() => setEditing(false)} project={p} />
    </div>
  )
}

function Stat({ value, label, danger }: { value: string; label: string; danger?: boolean }) {
  return (
    <Card className="p-4">
      <div className={cx('text-lg font-bold tabular', danger && 'text-danger')}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </Card>
  )
}

/** Saves when you stop typing — notes are the place for thinking, not forms. */
function NotesBox({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => {
    if (text === value) return
    const t = setTimeout(() => onSave(text), 600)
    return () => clearTimeout(t)
  }, [text, value, onSave])
  return (
    <Card className="p-1">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== value && onSave(text)}
        placeholder="Decisions, open questions, what you learned…"
        className="min-h-40 w-full resize-y rounded-xl bg-transparent p-3 text-base leading-relaxed outline-none placeholder:text-muted/70 sm:text-sm"
      />
    </Card>
  )
}

function Links({ project: p }: { project: Project }) {
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
          <a href={l.url} target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-accent">{l.label}</a>
          <ExternalLink size={12} className="shrink-0 text-muted" />
          <button aria-label="Remove link" onClick={() => update(p.id, { links: p.links.filter((x) => x.id !== l.id) })} className="text-muted hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} disabled={!url.trim()}><Plus size={15} /></Button>
      </div>
    </Card>
  )
}

type Draft = Pick<Project, 'title' | 'emoji' | 'description' | 'areaId' | 'goalId' | 'status' | 'startDate' | 'dueDate'>

export function ProjectEditor({ open, onClose, project, defaults, onCreated }: {
  open: boolean
  onClose: () => void
  project?: Project
  defaults?: Partial<Draft>
  onCreated?: (id: string) => void
}) {
  const today = useToday()
  const goals = useStore((s) => s.goals)
  const add = useStore((s) => s.addProject)
  const update = useStore((s) => s.updateProject)
  const blank = useMemo<Draft>(() => ({ title: '', emoji: '🚀', description: '', areaId: null, goalId: null, status: 'active', startDate: today, dueDate: null }), [today])
  const [d, setD] = useState<Draft>(blank)
  useEffect(() => { if (open) setD(project ? { ...project } : { ...blank, ...defaults }) /* eslint-disable-next-line */ }, [open])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = () => {
    if (!d.title.trim()) return
    if (project) update(project.id, { ...d, title: d.title.trim() })
    else { const id = add({ ...d, title: d.title.trim() }); onCreated?.(id) }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Edit project' : 'New project'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={!d.title.trim()}>{project ? 'Save' : 'Create project'}</Button></>}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={d.emoji} onChange={(v) => set('emoji', v)} />
          <Input autoFocus placeholder="e.g. Portfolio website" value={d.title} onChange={(e) => set('title', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} className="h-10 font-semibold" />
        </div>
        <div><Label>What is it, and what does “done” look like?</Label><Textarea value={d.description} onChange={(e) => set('description', e.target.value)} className="min-h-20" /></div>
        <div><Label>Area</Label><AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} /></div>
        <div>
          <Label>Status</Label>
          <Segmented value={d.status} onChange={(v) => set('status', v)} options={(Object.keys(STATUS) as ProjectStatus[]).map((k) => ({ value: k, label: STATUS[k].label }))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Start</Label><Input type="date" value={d.startDate ?? ''} onChange={(e) => set('startDate', e.target.value || null)} /></div>
          <div><Label hint="optional">Deadline</Label><Input type="date" value={d.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || null)} /></div>
        </div>
        {goals.length > 0 && (
          <div>
            <Label hint="optional">Serves a goal</Label>
            <Select value={d.goalId ?? ''} onChange={(e) => set('goalId', e.target.value || null)}>
              <option value="">No goal</option>
              {goals.filter((g) => g.status !== 'done' || g.id === d.goalId).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </Select>
          </div>
        )}
      </div>
    </Modal>
  )
}
