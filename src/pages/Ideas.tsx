import { formatDistanceToNowStrict } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CheckSquare, FolderKanban, Lightbulb, Pencil, Target, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AreaPicker } from '../components/AreaPicker'
import { GoalEditor } from '../components/GoalEditor'
import { AreaChip, Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, ProgressBar, Segmented, Textarea } from '../components/ui'
import { celebrate } from '../lib/celebrate'
import { addDaysKey } from '../lib/date'
import { useAreaMap, useData, useToday } from '../lib/hooks'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Idea, IdeaStatus } from '../lib/types'

const COLUMNS: { status: IdeaStatus; label: string; emoji: string; hint: string }[] = [
  { status: 'new', label: 'New', emoji: '💡', hint: 'Just captured' },
  { status: 'exploring', label: 'Exploring', emoji: '🔍', hint: 'Thinking it through' },
  { status: 'doing', label: 'Doing', emoji: '⚡', hint: 'Has real next steps' },
  { status: 'done', label: 'Done', emoji: '✅', hint: 'Made real' },
]
const NEXT: Partial<Record<IdeaStatus, IdeaStatus>> = { new: 'exploring', exploring: 'doing', doing: 'done' }

export function IdeasPage() {
  const d = useData()
  const addIdea = useStore((s) => s.addIdea)
  const setStatus = useStore((s) => s.setIdeaStatus)
  const [text, setText] = useState('')
  const [showDropped, setShowDropped] = useState(false)
  const [over, setOver] = useState<IdeaStatus | null>(null)

  const capture = () => {
    if (!text.trim()) return
    addIdea({ title: text.trim() })
    setText('')
    celebrate.tick()
  }

  const dropped = d.ideas.filter((i) => i.status === 'dropped')
  const open = d.ideas.filter((i) => i.status !== 'done' && i.status !== 'dropped').length

  return (
    <div>
      <PageHeader
        title="Ideas"
        subtitle={d.ideas.length ? `${open} open · ${d.ideas.filter((i) => i.status === 'done').length} made real` : 'Catch every idea now; decide what to do with it later.'}
      />

      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-surface/80 px-3 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
        <Lightbulb size={18} className="text-gold" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && capture()}
          placeholder="I have an idea…  (Enter to save)"
          className="h-13 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-[15px] placeholder:text-muted/70"
        />
        {text.trim() && <Button size="sm" variant="primary" onClick={capture}>Save idea</Button>}
      </div>

      {d.ideas.length === 0 ? (
        <EmptyState emoji="💡" title="An empty idea box">
          Business ideas, things to learn, gifts, trips, projects — write them here in one line. Later, turn the good ones into tasks or goals.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((c) => {
            const items = d.ideas.filter((i) => i.status === c.status).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            return (
              <div
                key={c.status}
                onDragOver={(e) => { e.preventDefault(); setOver(c.status) }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault(); setOver(null)
                  const id = e.dataTransfer.getData('text/idea-id')
                  if (id) { setStatus(id, c.status); if (c.status === 'done') celebrate.allDone() }
                }}
                className={cx('flex min-h-40 flex-col rounded-2xl border border-dashed p-2 transition', over === c.status ? 'border-accent bg-accent-soft' : 'border-transparent bg-surface-2/40')}
              >
                <div className="flex items-baseline justify-between px-2 pb-2 pt-1">
                  <span className="text-sm font-bold">{c.emoji} {c.label} <span className="text-muted">· {items.length}</span></span>
                  <span className="text-[11px] text-muted">{c.hint}</span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((i) => <IdeaCard key={i.id} idea={i} />)}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {dropped.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowDropped((s) => !s)} className="text-xs font-bold uppercase tracking-wider text-muted hover:text-text">
            {showDropped ? 'Hide' : 'Show'} dropped ideas · {dropped.length}
          </button>
          {showDropped && <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">{dropped.map((i) => <IdeaCard key={i.id} idea={i} />)}</div>}
        </div>
      )}
    </div>
  )
}

function IdeaCard({ idea }: { idea: Idea }) {
  const areas = useAreaMap()
  const tasks = useStore((s) => s.tasks)
  const goal = useStore((s) => (idea.goalId ? s.goals.find((g) => g.id === idea.goalId) : undefined))
  const setStatus = useStore((s) => s.setIdeaStatus)
  const linkGoal = useStore((s) => s.linkIdeaGoal)
  const ideaToProject = useStore((s) => s.ideaToProject)
  const [editing, setEditing] = useState(false)
  const [tasking, setTasking] = useState(false)
  const [goaling, setGoaling] = useState(false)

  const linked = tasks.filter((t) => idea.taskIds.includes(t.id))
  const linkedDone = linked.filter((t) => t.done).length
  const next = NEXT[idea.status]

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
      <Card
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/idea-id', idea.id)}
        className={cx('group cursor-grab p-3 active:cursor-grabbing', idea.status === 'dropped' && 'opacity-60')}
      >
        <button onClick={() => setEditing(true)} className="block w-full text-left">
          <div className={cx('font-semibold leading-snug', idea.status === 'done' && 'text-muted')}>{idea.title}</div>
          {idea.notes && <p className="mt-1 line-clamp-2 text-xs text-muted">{idea.notes}</p>}
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <AreaChip area={idea.areaId ? areas.get(idea.areaId) : undefined} />
          {goal && <span className="inline-flex items-center gap-1"><Target size={11} />{goal.title}</span>}
          <span>{formatDistanceToNowStrict(new Date(idea.createdAt))} old</span>
        </div>
        {linked.length > 0 && (
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-[11px] text-muted"><span>Tasks</span><span className="tabular">{linkedDone}/{linked.length}</span></div>
            <ProgressBar value={linkedDone / linked.length} height={4} />
          </div>
        )}
        <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
          {idea.status !== 'done' && idea.status !== 'dropped' && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setTasking(true)}><CheckSquare size={13} /> Task</Button>
              {!goal && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setGoaling(true)}><Target size={13} /> Goal</Button>}
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { const id = ideaToProject(idea.id); toast({ emoji: '🚀', message: 'Project created from your idea' }); navigate('projects', id) }}><FolderKanban size={13} /> Project</Button>
            </>
          )}
          <div className="ml-auto flex">
            {next && (
              <IconButton
                label={`Move to ${next}`}
                onClick={() => { setStatus(idea.id, next); if (next === 'done') { celebrate.allDone(); toast({ emoji: '🚀', message: 'Idea made real · +20 XP' }) } }}
                className="size-7"
              >
                <ArrowRight size={14} />
              </IconButton>
            )}
            <IconButton label="Edit" onClick={() => setEditing(true)} className="size-7"><Pencil size={13} /></IconButton>
          </div>
        </div>
      </Card>
      <IdeaEditor idea={idea} open={editing} onClose={() => setEditing(false)} />
      <IdeaToTask idea={idea} open={tasking} onClose={() => setTasking(false)} />
      <GoalEditor
        open={goaling}
        onClose={() => setGoaling(false)}
        defaults={{ title: idea.title, why: idea.notes, areaId: idea.areaId }}
        onCreated={(id) => { linkGoal(idea.id, id); toast({ emoji: '🎯', message: 'Goal created from your idea' }) }}
      />
    </motion.div>
  )
}

function IdeaToTask({ idea, open, onClose }: { idea: Idea; open: boolean; onClose: () => void }) {
  const today = useToday()
  const ideaToTask = useStore((s) => s.ideaToTask)
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState<'today' | 'tomorrow' | 'inbox'>('today')
  useEffect(() => { if (open) setTitle(idea.title) }, [open, idea.title])

  const save = () => {
    if (!title.trim()) return
    ideaToTask(idea.id, title.trim(), when === 'today' ? today : when === 'tomorrow' ? addDaysKey(today, 1) : null)
    toast({ emoji: '✅', message: `Task added${when === 'inbox' ? ' to the Inbox' : ` for ${when}`}` })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Turn into a task" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Add task</Button></>}>
      <div className="space-y-4">
        <div>
          <Label hint="make it the very next physical step">Task</Label>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <div>
          <Label>When</Label>
          <Segmented value={when} onChange={setWhen} options={[{ value: 'today', label: 'Today' }, { value: 'tomorrow', label: 'Tomorrow' }, { value: 'inbox', label: 'Inbox' }]} />
        </div>
      </div>
    </Modal>
  )
}

function IdeaEditor({ idea, open, onClose }: { idea: Idea; open: boolean; onClose: () => void }) {
  const update = useStore((s) => s.updateIdea)
  const remove = useStore((s) => s.deleteIdea)
  const restore = useStore((s) => s.restoreIdea)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [areaId, setAreaId] = useState<string | null>(null)
  const [status, setStatusLocal] = useState<IdeaStatus>('new')

  useEffect(() => {
    if (!open) return
    setTitle(idea.title); setNotes(idea.notes); setAreaId(idea.areaId); setStatusLocal(idea.status)
  }, [open, idea])

  const save = () => {
    if (!title.trim()) return
    update(idea.id, { title: title.trim(), notes, areaId, status })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Idea"
      footer={
        <>
          <Button variant="danger" className="mr-auto" onClick={() => {
            const i = remove(idea.id)
            onClose()
            if (i) toast({ emoji: '🗑️', message: 'Idea deleted', action: { label: 'Undo', run: () => restore(i) } }, 8000)
          }}><Trash2 size={15} /> Delete</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 text-base font-semibold" />
        <div><Label>Notes</Label><Textarea placeholder="Why it is interesting, first steps, open questions…" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-28" /></div>
        <div><Label>Area</Label><AreaPicker value={areaId} onChange={setAreaId} /></div>
        <div>
          <Label>Stage</Label>
          <Segmented
            value={status}
            onChange={setStatusLocal}
            options={[...COLUMNS.map((c) => ({ value: c.status, label: c.label })), { value: 'dropped' as IdeaStatus, label: 'Dropped' }]}
          />
        </div>
      </div>
    </Modal>
  )
}

