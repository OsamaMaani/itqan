import { AlignLeft, Archive, ArchiveRestore, CheckSquare, FolderKanban, ListChecks, Pin, PinOff, Plus, Target, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { useI18n } from '../i18n/react'
import { AREA_HEX } from '../lib/colors'
import { addDaysKey } from '../lib/date'
import { useAreaMap, useToday } from '../lib/hooks'
import { uid } from '../lib/id'
import { checklistProgress, itemDone, itemsToText, noteLabels, parseLabels, textToItems } from '../lib/notes'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { AREA_COLORS, type AreaColor, type ID, type Note, type NoteItem, type Task } from '../lib/types'
import { AreaPicker } from './AreaPicker'
import { Checkbox } from './TaskItem'
import { AreaChip, Button, Card, cx, IconButton, Input, Label, Modal, Segmented, Select, Textarea } from './ui'

/**
 * Notes (ADR-035): the editor, the card and the notes section of a project or goal. The editor is
 * mounted once in App (`GlobalNoteEditor`) so the Notes screen, a project, a goal and the command
 * bar all open the same one with `openNote`.
 */

type NoteDefaults = Partial<Pick<Note, 'title' | 'body' | 'items' | 'areaId' | 'projectId' | 'goalId' | 'labels' | 'color'>> & {
  /** Open on an empty checklist instead of text */
  checklist?: boolean
}

/** `opened` counts openings: each one mounts a fresh editor, so no draft can leak into the next note. */
const useNoteEditor = create<{ editing: Note | NoteDefaults | null; opened: number }>(() => ({ editing: null, opened: 0 }))

/** Opens the editor on a note, or on a new note with these defaults. */
export function openNote(x: Note | NoteDefaults = {}) {
  useNoteEditor.setState((s) => ({ editing: x, opened: s.opened + 1 }))
}

export function GlobalNoteEditor() {
  const editing = useNoteEditor((s) => s.editing)
  const opened = useNoteEditor((s) => s.opened)
  return <NoteEditor key={opened} value={editing} onClose={() => useNoteEditor.setState({ editing: null })} />
}

/** A note's tint: the colour mixed into the card surface, so text keeps its contrast in both themes. */
export function noteTint(color: AreaColor | null): React.CSSProperties | undefined {
  if (!color) return undefined
  const hex = AREA_HEX[color]
  return { background: `color-mix(in srgb, ${hex} 14%, var(--surface))`, borderColor: `${hex}55` }
}

const URL_RE = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]}'])/g

/** Plain text with its web addresses made into links (opened in a new tab). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="pointer-events-auto relative break-words text-accent underline underline-offset-2">{p}</a>
          : p,
      )}
    </>
  )
}

function useTaskMap(): Map<ID, Task> {
  const tasks = useStore((s) => s.tasks)
  return useMemo(() => new Map(tasks.map((x) => [x.id, x])), [tasks])
}

// --- the card --------------------------------------------------------------------------------

const CARD_LINES = 6

/** A note on a grid. The whole card opens the editor; ticking a line and pinning work in place. */
export function NoteCard({ note, compact }: { note: Note; compact?: boolean }) {
  const t = useI18n()
  const L = t.m.notes
  const areas = useAreaMap()
  const tasks = useTaskMap()
  const project = useStore((s) => (note.projectId ? s.projects.find((p) => p.id === note.projectId) : undefined))
  const goal = useStore((s) => (note.goalId ? s.goals.find((g) => g.id === note.goalId) : undefined))
  const update = useStore((s) => s.updateNote)
  const toggleItem = useStore((s) => s.toggleNoteItem)

  const items = note.items.filter((i) => i.text.trim())
  const ordered = [...items.filter((i) => !itemDone(i, tasks)), ...items.filter((i) => itemDone(i, tasks))]
  const shown = ordered.slice(0, compact ? 3 : CARD_LINES)
  const progress = checklistProgress(note, tasks)
  const area = note.areaId ? areas.get(note.areaId) : undefined
  const empty = !note.title && !note.body.trim() && items.length === 0

  const archive = () => {
    update(note.id, { archived: !note.archived, pinned: false })
    toast({ emoji: note.archived ? '📝' : '🗃️', message: note.archived ? L.unarchivedToast : L.archivedToast, action: { label: t.m.common.undo, run: () => update(note.id, { archived: note.archived, pinned: note.pinned }) } })
  }

  return (
    <Card className="group relative p-0" style={noteTint(note.color)}>
      <button onClick={() => openNote(note)} aria-label={note.title || L.untitled} className="absolute inset-0 rounded-2xl" />
      {!compact && (
        <div className="absolute end-1.5 top-1.5 z-10 flex">
          <IconButton label={note.archived ? t.m.common.unarchive : t.m.common.archive} onClick={archive} className="size-8 bg-surface/70 sm:opacity-0 sm:group-hover:opacity-100">
            {note.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          </IconButton>
          <IconButton
            label={note.pinned ? L.unpin : L.pin}
            onClick={() => update(note.id, { pinned: !note.pinned })}
            className={cx('size-8', note.pinned ? 'text-accent' : 'sm:opacity-0 sm:group-hover:opacity-100')}
          >
            {note.pinned ? <PinOff size={15} /> : <Pin size={15} />}
          </IconButton>
        </div>
      )}
      <div className={cx('pointer-events-none relative', compact ? 'p-3' : 'p-4 pe-[4.5rem] sm:pe-10')}>
        {(note.title || empty) && <div className={cx('break-words font-bold leading-snug', empty && 'text-muted')}><bdi>{note.title || L.untitled}</bdi></div>}
        {note.body.trim() && (
          <p dir="auto" className={cx('whitespace-pre-wrap break-words text-sm leading-relaxed', note.title && 'mt-1.5', compact ? 'line-clamp-3' : 'line-clamp-[12]')}>
            <Linkified text={note.body.trim()} />
          </p>
        )}
        {shown.length > 0 && (
          <ul className={cx('space-y-1', (note.title || note.body.trim()) && 'mt-2')}>
            {shown.map((i) => {
              const done = itemDone(i, tasks)
              return (
                <li key={i.id} className="flex items-start gap-2 text-sm">
                  <span className="pointer-events-auto mt-px"><Checkbox checked={done} onChange={() => { if (!(i.taskId && tasks.get(i.taskId)?.done)) toggleItem(note.id, i.id) }} /></span>
                  <span className={cx('min-w-0 flex-1 break-words', done && 'text-muted line-through')}><bdi>{i.text}</bdi></span>
                  {i.taskId && tasks.has(i.taskId) && <span title={L.madeTask} className="mt-0.5 text-accent"><CheckSquare size={13} /></span>}
                </li>
              )
            })}
          </ul>
        )}
        {ordered.length > shown.length && <div className="mt-1 ps-7 text-xs text-muted">{t.p(L.moreItems, ordered.length - shown.length)}</div>}
      </div>
      <div className={cx('pointer-events-none relative flex flex-wrap items-center gap-1.5 text-[11px] text-muted empty:hidden', compact ? '-mt-1 px-3 pb-3' : '-mt-1 px-4 pb-4')}>
        {progress.total > 0 && <span className="rounded-md bg-surface-2/70 px-1.5 py-0.5 font-bold tabular">{t.n(progress.done)}/{t.n(progress.total)}</span>}
        {note.labels.map((l) => <span key={l} className="rounded-md bg-surface-2/70 px-1.5 py-0.5 font-semibold"><bdi>#{l}</bdi></span>)}
        {area && <AreaChip area={area} />}
        {project && !compact && <span className="inline-flex items-center gap-1"><FolderKanban size={11} />{project.title}</span>}
        {goal && !compact && <span className="inline-flex items-center gap-1"><Target size={11} />{goal.title}</span>}
      </div>
    </Card>
  )
}

// --- the editor ------------------------------------------------------------------------------

interface Draft {
  title: string
  body: string
  items: NoteItem[]
  color: AreaColor | null
  labels: string
  pinned: boolean
  archived: boolean
  areaId: ID | null
  projectId: ID | null
  goalId: ID | null
}

function draftOf(v: Note | NoteDefaults): Draft {
  return {
    title: v.title ?? '', body: v.body ?? '', items: (v.items ?? []).map((i) => ({ ...i })), color: v.color ?? null,
    labels: (v.labels ?? []).join(', '), pinned: 'id' in v ? v.pinned : false, archived: 'id' in v ? v.archived : false,
    areaId: v.areaId ?? null, projectId: v.projectId ?? null, goalId: v.goalId ?? null,
  }
}

/** What the draft would store. */
function fieldsOf(d: Draft) {
  return {
    title: d.title.trim(), body: d.body.replace(/\s+$/, ''), items: d.items.filter((i) => i.text.trim()).map((i) => ({ ...i, text: i.text.trim() })),
    color: d.color, labels: parseLabels(d.labels), pinned: d.pinned, archived: d.archived, areaId: d.areaId, projectId: d.projectId, goalId: d.goalId,
  }
}

/**
 * Closing the editor saves it, as in Keep: a note is never lost by tapping outside. A new note
 * with nothing in it is simply not created.
 */
function NoteEditor({ value, onClose }: { value: Note | NoteDefaults | null; onClose: () => void }) {
  const t = useI18n()
  const { m } = t
  const L = m.notes
  const st = useStore.getState
  const projects = useStore((s) => s.projects)
  const goals = useStore((s) => s.goals)
  const allNotes = useStore((s) => s.notes)
  const tasks = useTaskMap()
  // Mounted afresh for every opening (GlobalNoteEditor's key), so the draft starts from `value`.
  const [d, setD] = useState<Draft>(() => draftOf(value ?? {}))
  const [newItem, setNewItem] = useState('')
  /** The checklist is showing (it may have no lines yet). */
  const [listMode, setListMode] = useState(() => !!value && !('id' in value) && !!value.checklist)
  const [tasking, setTasking] = useState<{ noteId: ID; itemId?: ID; title: string } | null>(null)
  const idRef = useRef<ID | null>(value && 'id' in value ? value.id : null)
  const addRef = useRef<HTMLInputElement>(null)
  const open = value !== null

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const setItem = (id: ID, patch: Partial<NoteItem>) => setD((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))

  /** Saves the draft; returns the note's id, or null for a new note left empty. */
  const commit = (draft: Draft = d): ID | null => {
    const f = fieldsOf(newItem.trim() ? { ...draft, items: [...draft.items, { id: uid(), text: newItem, done: false, taskId: null }] } : draft)
    const id = idRef.current
    if (id) {
      const n = st().notes.find((x) => x.id === id)
      if (!n) return null
      const same = (Object.keys(f) as (keyof typeof f)[]).every((k) => JSON.stringify(n[k]) === JSON.stringify(f[k]))
      if (!same) st().updateNote(id, f)
      return id
    }
    if (!f.title && !f.body.trim() && f.items.length === 0) return null
    idRef.current = st().addNote(f)
    return idRef.current
  }

  const close = () => { commit(); onClose() }

  const addItem = () => {
    if (!newItem.trim()) return
    setD((x) => ({ ...x, items: [...x.items, { id: uid(), text: newItem.trim(), done: false, taskId: null }] }))
    setNewItem('')
  }

  /** Saves first, so the task links to a note that exists; then shows the task dialog. */
  const makeTask = (itemId?: ID) => {
    const id = commit()
    setNewItem('')
    if (!id) return
    const n = st().notes.find((x) => x.id === id)
    if (!n) return
    setD((x) => ({ ...x, items: n.items.map((i) => ({ ...i })) }))
    const item = itemId ? n.items.find((i) => i.id === itemId) : undefined
    setTasking({ noteId: id, itemId: item?.id, title: item ? item.text : n.title || n.body.split('\n')[0].trim() })
  }

  const afterTask = () => {
    const n = idRef.current ? st().notes.find((x) => x.id === idRef.current) : undefined
    if (n) setD((x) => ({ ...x, items: x.items.map((i) => ({ ...i, taskId: n.items.find((y) => y.id === i.id)?.taskId ?? i.taskId })) }))
  }

  const remove = () => {
    const id = idRef.current
    onClose()
    if (!id) return
    const n = st().deleteNote(id)
    if (n) toast({ emoji: '🗑️', message: L.deletedToast, action: { label: m.common.undo, run: () => st().restoreNote(n) } }, 8000)
  }

  const toChecklist = () => {
    setD((x) => ({ ...x, items: [...x.items, ...textToItems(x.body, uid)], body: '' }))
    setListMode(true)
    setTimeout(() => addRef.current?.focus())
  }
  const toText = () => {
    setD((x) => ({ ...x, body: [x.body.replace(/\s+$/, ''), itemsToText(newItem.trim() ? [...x.items, { id: '', text: newItem, done: false, taskId: null }] : x.items)].filter(Boolean).join('\n'), items: [] }))
    setNewItem('')
    setListMode(false)
  }
  const listOn = listMode || d.items.length > 0

  const usedLabels = noteLabels(allNotes).map((l) => l.label)
  const chosen = parseLabels(d.labels)
  const suggest = usedLabels.filter((l) => !chosen.some((c) => c.toLowerCase() === l.toLowerCase())).slice(0, 12)
  const openItems = d.items.filter((i) => !itemDone(i, tasks))
  const doneItems = d.items.filter((i) => itemDone(i, tasks))
  const existing = idRef.current ? allNotes.find((n) => n.id === idRef.current) : undefined
  const tint = noteTint(d.color)

  const row = (i: NoteItem) => {
    const done = itemDone(i, tasks)
    const taskDone = !!i.taskId && tasks.get(i.taskId)?.done === true
    return (
      <div key={i.id} className="group flex items-center gap-2">
        <Checkbox checked={done} onChange={() => { if (!taskDone) setItem(i.id, { done: !i.done }) }} />
        <input
          dir="auto"
          value={i.text}
          onChange={(e) => setItem(i.id, { text: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRef.current?.focus() } }}
          className={cx('h-9 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm', done && 'text-muted line-through')}
        />
        {i.taskId && tasks.has(i.taskId)
          ? <span title={L.madeTask} className="grid size-8 place-items-center text-accent"><CheckSquare size={15} /></span>
          : <IconButton label={L.editor.itemToTask} onClick={() => makeTask(i.id)} className="size-8 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"><CheckSquare size={15} /></IconButton>}
        <IconButton label={L.editor.removeItem} onClick={() => setD((x) => ({ ...x, items: x.items.filter((y) => y.id !== i.id) }))} className="size-8 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"><X size={15} /></IconButton>
      </div>
    )
  }

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        wide
        title={existing ? (existing.title || L.untitled) : L.newNote}
        footer={
          <>
            {existing && <Button variant="danger" className="me-auto" onClick={remove}><Trash2 size={15} /> {m.common.delete}</Button>}
            <IconButton label={d.pinned ? L.unpin : L.pin} onClick={() => set('pinned', !d.pinned)} className={d.pinned ? 'text-accent' : ''}>{d.pinned ? <PinOff size={16} /> : <Pin size={16} />}</IconButton>
            <IconButton label={d.archived ? m.common.unarchive : m.common.archive} onClick={() => set('archived', !d.archived)} className={d.archived ? 'text-accent' : ''}>{d.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}</IconButton>
            <Button variant="ghost" onClick={() => makeTask()} disabled={!d.title.trim() && !d.body.trim()}><CheckSquare size={15} /> {L.editor.makeTask}</Button>
            <Button variant="primary" onClick={close}>{m.common.done}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-border p-3 transition-colors" style={tint}>
            <input
              dir="auto"
              autoFocus={!value || !('id' in value)}
              value={d.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={L.editor.titlePlaceholder}
              className="h-10 w-full bg-transparent text-lg font-bold outline-none placeholder:text-muted/70"
            />
            {(!listOn || d.body) && (
              <Textarea
                dir="auto"
                value={d.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder={L.editor.bodyPlaceholder}
                className="min-h-36 border-0 bg-transparent px-0 focus:ring-0"
              />
            )}
            {listOn && (
              <div>
                {openItems.map(row)}
                <div className="flex items-center gap-2">
                  <span className="grid size-[22px] shrink-0 place-items-center text-muted"><Plus size={16} /></span>
                  <input
                    ref={addRef}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                    onBlur={addItem}
                    placeholder={L.editor.addItem}
                    className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70 sm:text-sm"
                  />
                </div>
                {doneItems.length > 0 && <div className="mt-2 border-t border-border pt-2">{doneItems.map(row)}</div>}
              </div>
            )}
            <div className="flex justify-end">
              {!listOn
                ? <Button size="sm" variant="ghost" onClick={toChecklist}><ListChecks size={14} /> {L.editor.toChecklist}</Button>
                : <Button size="sm" variant="ghost" onClick={toText}><AlignLeft size={14} /> {L.editor.toText}</Button>}
            </div>
          </div>

          <div>
            <Label>{L.editor.colour}</Label>
            <div className="flex flex-wrap gap-2">
              <ColourDot on={d.color === null} label={L.editor.noColour} onClick={() => set('color', null)} />
              {AREA_COLORS.map((c) => <ColourDot key={c} on={d.color === c} label={m.settings.areas.colours[c]} hex={AREA_HEX[c]} onClick={() => set('color', c)} />)}
            </div>
          </div>

          <div>
            <Label hint={L.editor.labelsHint}>{L.editor.labels}</Label>
            <Input value={d.labels} onChange={(e) => set('labels', e.target.value)} placeholder={L.editor.labelsPlaceholder} />
            {suggest.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted">{L.editor.labelsUsed}</span>
                {suggest.map((l) => (
                  <button key={l} type="button" onClick={() => set('labels', [...chosen, l].join(', '))} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted hover:text-text"><bdi>#{l}</bdi></button>
                ))}
              </div>
            )}
          </div>

          <div><Label>{m.common.area}</Label><AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} /></div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{m.common.project}</Label>
              <Select value={d.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || null)}>
                <option value="">{m.common.noProject}</option>
                {projects.filter((p) => p.status !== 'archived' || p.id === d.projectId).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
              </Select>
            </div>
            <div>
              <Label>{m.common.goal}</Label>
              <Select value={d.goalId ?? ''} onChange={(e) => set('goalId', e.target.value || null)}>
                <option value="">{m.common.noGoal}</option>
                {goals.filter((g) => g.status !== 'done' || g.id === d.goalId).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </Select>
            </div>
          </div>

          {existing && <p className="text-end text-[11px] text-muted">{t.f(L.edited, { date: t.d(new Date(existing.updatedAt), 'medium') })}</p>}
        </div>
      </Modal>
      <NoteToTask value={tasking} onClose={() => setTasking(null)} onDone={afterTask} />
    </>
  )
}

function ColourDot({ on, label, hex, onClick }: { on: boolean; label: string; hex?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={cx('grid size-8 place-items-center rounded-full border transition', on ? 'scale-110 ring-2 ring-text/40 ring-offset-2 ring-offset-surface' : 'hover:scale-110', hex ? 'border-transparent' : 'border-border bg-surface-2')}
      style={hex ? { background: hex } : undefined}
    >
      {!hex && <X size={14} className="text-muted" />}
    </button>
  )
}

function NoteToTask({ value, onClose, onDone }: { value: { noteId: ID; itemId?: ID; title: string } | null; onClose: () => void; onDone: () => void }) {
  const t = useI18n()
  const L = t.m.notes.toTask
  const today = useToday()
  const noteToTask = useStore((s) => s.noteToTask)
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState<'today' | 'tomorrow' | 'inbox'>('inbox')
  useEffect(() => { if (value) { setTitle(value.title); setWhen('inbox') } }, [value])

  const save = () => {
    if (!value || !title.trim()) return
    noteToTask(value.noteId, title.trim(), when === 'today' ? today : when === 'tomorrow' ? addDaysKey(today, 1) : null, value.itemId)
    toast({ emoji: '✅', message: when === 'inbox' ? L.addedInbox : when === 'today' ? L.addedToday : L.addedTomorrow })
    onDone()
    onClose()
  }

  return (
    <Modal open={value !== null} onClose={onClose} title={L.title} footer={<><Button variant="ghost" onClick={onClose}>{t.m.common.cancel}</Button><Button variant="primary" onClick={save} disabled={!title.trim()}>{L.addTask}</Button></>}>
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

// --- notes of a project or goal --------------------------------------------------------------

/** The notes about one project or goal, and a button to add one there. */
export function LinkedNotes({ projectId, goalId, areaId, title }: { projectId?: ID; goalId?: ID; areaId?: ID | null; title?: ReactNode }) {
  const t = useI18n()
  const L = t.m.notes.linked
  const all = useStore((s) => s.notes)
  const notes = all
    .filter((n) => !n.archived && (projectId ? n.projectId === projectId : n.goalId === goalId))
    .sort((a, b) => (a.pinned === b.pinned ? b.updatedAt.localeCompare(a.updatedAt) : a.pinned ? -1 : 1))
  return (
    <div className="space-y-2">
      {title}
      {notes.map((n) => <NoteCard key={n.id} note={n} compact />)}
      {notes.length === 0 && <p className="text-sm text-muted">{L.empty}</p>}
      <Button size="sm" variant="ghost" onClick={() => openNote({ projectId: projectId ?? null, goalId: goalId ?? null, areaId: areaId ?? null })}>
        <Plus size={14} /> {L.add}
      </Button>
    </div>
  )
}

/** Goes to the Notes screen and opens a new note there. */
export function newNoteFromAnywhere(defaults: NoteDefaults = {}) {
  navigate('notes')
  openNote(defaults)
}
