import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CheckSquare, FolderKanban, Lightbulb, Pencil, Target, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AreaPicker } from '../components/AreaPicker'
import { GoalEditor } from '../components/GoalEditor'
import { AreaChip, Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, ProgressBar, Segmented, Textarea } from '../components/ui'
import { useI18n } from '../i18n/react'
import type { I18n } from '../i18n/core'
import { celebrate } from '../lib/celebrate'
import { addDaysKey } from '../lib/date'
import { useAreaMap, useData, useToday } from '../lib/hooks'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Idea, IdeaStatus } from '../lib/types'

const COLUMNS: { status: Exclude<IdeaStatus, 'dropped'>; emoji: string }[] = [
  { status: 'new', emoji: '💡' },
  { status: 'exploring', emoji: '🔍' },
  { status: 'doing', emoji: '⚡' },
  { status: 'done', emoji: '✅' },
]
const NEXT: Partial<Record<IdeaStatus, 'exploring' | 'doing' | 'done'>> = { new: 'exploring', exploring: 'doing', doing: 'done' }

/** "3 days old" for a stored timestamp, in the interface language. */
function ageText(iso: string, t: I18n): string {
  const L = t.m.ideas.age
  const mins = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return L.now
  if (mins < 60) return t.p(L.minutes, mins)
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t.p(L.hours, hours)
  const days = Math.floor(hours / 24)
  if (days < 30) return t.p(L.days, days)
  if (days < 365) return t.p(L.months, Math.floor(days / 30))
  return t.p(L.years, Math.floor(days / 365))
}

export function IdeasPage() {
  const t = useI18n()
  const L = t.m.ideas
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
        title={t.m.nav.ideas}
        subtitle={d.ideas.length ? t.f(L.subtitleCount, { open, done: d.ideas.filter((i) => i.status === 'done').length }) : L.subtitleEmpty}
      />

      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-surface/80 px-3 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
        <Lightbulb size={18} className="text-gold" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && capture()}
          placeholder={L.capturePlaceholder}
          className="h-13 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-[15px] placeholder:text-muted/70"
        />
        {text.trim() && <Button size="sm" variant="primary" onClick={capture}>{L.saveIdea}</Button>}
      </div>

      {d.ideas.length === 0 ? (
        <EmptyState emoji="💡" title={L.emptyTitle}>{L.emptyBody}</EmptyState>
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
                  <span className="text-sm font-bold">{c.emoji} {L.status[c.status]} <span className="text-muted">· {t.n(items.length)}</span></span>
                  <span className="text-[11px] text-muted">{L.hint[c.status]}</span>
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
            {t.f(showDropped ? L.hideDropped : L.showDropped, { n: dropped.length })}
          </button>
          {showDropped && <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">{dropped.map((i) => <IdeaCard key={i.id} idea={i} />)}</div>}
        </div>
      )}
    </div>
  )
}

function IdeaCard({ idea }: { idea: Idea }) {
  const t = useI18n()
  const L = t.m.ideas
  const areas = useAreaMap()
  const tasks = useStore((s) => s.tasks)
  const goal = useStore((s) => (idea.goalId ? s.goals.find((g) => g.id === idea.goalId) : undefined))
  const setStatus = useStore((s) => s.setIdeaStatus)
  const linkGoal = useStore((s) => s.linkIdeaGoal)
  const ideaToProject = useStore((s) => s.ideaToProject)
  const [editing, setEditing] = useState(false)
  const [tasking, setTasking] = useState(false)
  const [goaling, setGoaling] = useState(false)

  const linked = tasks.filter((x) => idea.taskIds.includes(x.id))
  const linkedDone = linked.filter((x) => x.done).length
  const next = NEXT[idea.status]

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
      <Card
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/idea-id', idea.id)}
        className={cx('group cursor-grab p-3 active:cursor-grabbing', idea.status === 'dropped' && 'opacity-60')}
      >
        <button onClick={() => setEditing(true)} className="block w-full text-start">
          <div className={cx('font-semibold leading-snug', idea.status === 'done' && 'text-muted')}>{idea.title}</div>
          {idea.notes && <p className="mt-1 line-clamp-2 text-xs text-muted">{idea.notes}</p>}
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <AreaChip area={idea.areaId ? areas.get(idea.areaId) : undefined} />
          {goal && <span className="inline-flex items-center gap-1"><Target size={11} />{goal.title}</span>}
          <span>{ageText(idea.createdAt, t)}</span>
        </div>
        {linked.length > 0 && (
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-[11px] text-muted"><span>{L.tasks}</span><span className="tabular">{t.n(linkedDone)}/{t.n(linked.length)}</span></div>
            <ProgressBar value={linkedDone / linked.length} height={4} />
          </div>
        )}
        <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
          {idea.status !== 'done' && idea.status !== 'dropped' && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setTasking(true)}><CheckSquare size={13} /> {L.task}</Button>
              {!goal && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setGoaling(true)}><Target size={13} /> {t.m.common.goal}</Button>}
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { const id = ideaToProject(idea.id); toast({ emoji: '🚀', message: L.projectCreated }); navigate('projects', id) }}><FolderKanban size={13} /> {t.m.common.project}</Button>
            </>
          )}
          <div className="ms-auto flex">
            {next && (
              <IconButton
                label={L.moveTo[next]}
                onClick={() => { setStatus(idea.id, next); if (next === 'done') { celebrate.allDone(); toast({ emoji: '🚀', message: L.madeReal }) } }}
                className="size-7"
              >
                <ArrowRight size={14} className="rtl:-scale-x-100" />
              </IconButton>
            )}
            <IconButton label={t.m.common.edit} onClick={() => setEditing(true)} className="size-7"><Pencil size={13} /></IconButton>
          </div>
        </div>
      </Card>
      <IdeaEditor idea={idea} open={editing} onClose={() => setEditing(false)} />
      <IdeaToTask idea={idea} open={tasking} onClose={() => setTasking(false)} />
      <GoalEditor
        open={goaling}
        onClose={() => setGoaling(false)}
        defaults={{ title: idea.title, why: idea.notes, areaId: idea.areaId }}
        onCreated={(id) => { linkGoal(idea.id, id); toast({ emoji: '🎯', message: L.goalCreated }) }}
      />
    </motion.div>
  )
}

function IdeaToTask({ idea, open, onClose }: { idea: Idea; open: boolean; onClose: () => void }) {
  const t = useI18n()
  const L = t.m.ideas.toTask
  const today = useToday()
  const ideaToTask = useStore((s) => s.ideaToTask)
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState<'today' | 'tomorrow' | 'inbox'>('today')
  useEffect(() => { if (open) setTitle(idea.title) }, [open, idea.title])

  const save = () => {
    if (!title.trim()) return
    ideaToTask(idea.id, title.trim(), when === 'today' ? today : when === 'tomorrow' ? addDaysKey(today, 1) : null)
    toast({ emoji: '✅', message: when === 'inbox' ? L.addedInbox : when === 'today' ? L.addedToday : L.addedTomorrow })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={L.title} footer={<><Button variant="ghost" onClick={onClose}>{t.m.common.cancel}</Button><Button variant="primary" onClick={save}>{L.addTask}</Button></>}>
      <div className="space-y-4">
        <div>
          <Label hint={L.taskHint}>{L.task}</Label>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <div>
          <Label>{L.when}</Label>
          <Segmented value={when} onChange={setWhen} options={[{ value: 'today', label: t.m.time.today }, { value: 'tomorrow', label: t.m.time.tomorrow }, { value: 'inbox', label: L.inbox }]} />
        </div>
      </div>
    </Modal>
  )
}

function IdeaEditor({ idea, open, onClose }: { idea: Idea; open: boolean; onClose: () => void }) {
  const t = useI18n()
  const L = t.m.ideas
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
      title={L.editor.title}
      footer={
        <>
          <Button variant="danger" className="me-auto" onClick={() => {
            const i = remove(idea.id)
            onClose()
            if (i) toast({ emoji: '🗑️', message: L.editor.deleted, action: { label: t.m.common.undo, run: () => restore(i) } }, 8000)
          }}><Trash2 size={15} /> {t.m.common.delete}</Button>
          <Button variant="ghost" onClick={onClose}>{t.m.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>{t.m.common.save}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 text-base font-semibold" />
        <div><Label>{t.m.common.notes}</Label><Textarea placeholder={L.editor.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-28" /></div>
        <div><Label>{t.m.common.area}</Label><AreaPicker value={areaId} onChange={setAreaId} /></div>
        <div>
          <Label>{L.editor.stage}</Label>
          <Segmented
            value={status}
            onChange={setStatusLocal}
            options={[...COLUMNS.map((c) => ({ value: c.status as IdeaStatus, label: L.status[c.status] })), { value: 'dropped' as IdeaStatus, label: L.status.dropped }]}
          />
        </div>
      </div>
    </Modal>
  )
}

