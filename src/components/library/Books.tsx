import { BookOpen, CheckSquare, FileText, Pencil, Repeat, Target, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { tx } from '../../i18n/core'
import { useI18n } from '../../i18n/react'
import { AREA_HEX } from '../../lib/colors'
import { todayKey } from '../../lib/date'
import { countsMinutes } from '../../lib/habits'
import { useAreaMap } from '../../lib/hooks'
import { bookProgress, pagesForward, placeOf, readingTotals } from '../../lib/library'
import { addPdfFiles, pickPdfs, removePdfHere, useFiles, wantCover } from '../../lib/libraryFiles'
import { settleBookLinks, useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import { uid } from '../../lib/id'
import { AREA_COLORS, BOOK_STATUSES, type AreaColor, type Book, type BookStatus } from '../../lib/types'
import { AreaPicker } from '../AreaPicker'
import { AreaChip, Button, Card, cx, IconButton, Input, Label, Modal, ProgressBar, Segmented, Select, Textarea } from '../ui'
import { openReader } from './Reader'

/**
 * The Library's pieces (ADR-046): a book's cover, its card, the details dialog every card opens,
 * and the editor. The dialogs are mounted once in App, like the note editor, and opened with
 * `openBook` / `editBook`.
 */

const useBookDialogs = create<{ details: string | null; editing: Partial<Book> | null; opened: number }>(() => ({ details: null, editing: null, opened: 0 }))

export function openBook(id: string) { useBookDialogs.setState({ details: id }) }
export function editBook(b: Partial<Book> = {}) { useBookDialogs.setState((s) => ({ editing: b, opened: s.opened + 1 })) }
/** A PDF book opens in the reader (which offers to choose the file if this device lacks it); any other book, its details. */
export function openBookOrReader(b: Book) { if (b.file) openReader(b.id); else openBook(b.id) }

export function GlobalBookDialogs() {
  const details = useBookDialogs((s) => s.details)
  const editing = useBookDialogs((s) => s.editing)
  const opened = useBookDialogs((s) => s.opened)
  return (
    <>
      <BookDetails id={details} onClose={() => useBookDialogs.setState({ details: null })} />
      <BookEditor key={opened} value={editing} onClose={() => useBookDialogs.setState({ editing: null })} />
    </>
  )
}

/** The pages-and-place line: "Page 50 of 320", "Page 50", "Not started", "Finished 3 Nov". */
export function usePlaceLine(b: Book): string {
  const t = useI18n()
  const L = t.m.library
  const page = useStore((s) => placeOf(b.id, s.bookPlaces))
  if (b.status === 'finished') return b.finishedOn ? t.f(L.finishedOn, { date: t.d(b.finishedOn, 'medium') }) : L.status.finished
  if (page <= 0) return b.pages ? t.p(L.pagesCount, b.pages) : L.notStarted
  return b.pages ? t.f(L.pageOf, { page: t.n(page), pages: t.n(b.pages) }) : t.f(L.pageOnly, { page: t.n(page) })
}

/** The first page of the PDF when this device has it, else a coloured cover with the title. */
export function BookCover({ book, className }: { book: Book; className?: string }) {
  const hash = book.file?.hash
  const url = useFiles((s) => (hash ? s.covers[hash] : undefined))
  const areas = useAreaMap()
  useEffect(() => { if (hash) wantCover(hash) }, [hash])
  const hex = book.color ? AREA_HEX[book.color] : areas.get(book.areaId ?? '')?.color ? AREA_HEX[areas.get(book.areaId!)!.color] : '#64748b'
  return (
    <div className={cx('relative aspect-[2/3] overflow-hidden rounded-lg border border-black/5 shadow-sm', className)}>
      {url
        ? <img src={url} alt="" className="size-full object-cover object-top" draggable={false} />
        : (
          <div className="flex size-full flex-col justify-between p-2.5 text-white" style={{ background: `linear-gradient(160deg, ${hex}, color-mix(in srgb, ${hex} 55%, #000))` }}>
            <div className="line-clamp-4 text-[13px] font-bold leading-snug" dir="auto">{book.title}</div>
            {book.author && <div className="line-clamp-2 text-[10px] font-medium opacity-80" dir="auto">{book.author}</div>}
          </div>
        )}
      <div className="pointer-events-none absolute inset-y-0 start-0 w-1.5 bg-gradient-to-r from-black/20 to-transparent rtl:bg-gradient-to-l" />
    </div>
  )
}

export function BookCard({ book }: { book: Book }) {
  const t = useI18n()
  const L = t.m.library
  const page = useStore((s) => placeOf(book.id, s.bookPlaces))
  const here = useFiles((s) => (book.file ? s.here?.has(book.file.hash) ?? true : true))
  const line = usePlaceLine(book)
  const progress = bookProgress(book, page)
  return (
    <div className="group relative flex flex-col gap-2">
      <BookCover book={book} className="transition group-hover:-translate-y-0.5 group-hover:shadow-md" />
      <div className="min-w-0">
        <div className="line-clamp-2 text-sm font-semibold leading-snug" dir="auto">{book.title}</div>
        {book.author && <div className="truncate text-xs text-muted" dir="auto">{book.author}</div>}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
          {book.file && <FileText size={12} className={cx('shrink-0', here ? 'text-accent' : 'opacity-60')} aria-label={here ? L.pdfHere : L.pdfElsewhere} />}
          <span className="truncate tabular">{line}</span>
        </div>
        {book.status === 'reading' && progress > 0 && <ProgressBar value={progress} className="mt-1.5" height={4} />}
      </div>
      <button onClick={() => openBook(book.id)} aria-label={book.title} className="absolute inset-0 rounded-lg" />
    </div>
  )
}

/** The book being read most recently, large, with Continue. */
export function ContinueCard({ book }: { book: Book }) {
  const t = useI18n()
  const L = t.m.library
  const page = useStore((s) => placeOf(book.id, s.bookPlaces))
  const here = useFiles((s) => (book.file ? s.here?.has(book.file.hash) ?? false : false))
  const line = usePlaceLine(book)
  return (
    <Card className="relative flex items-center gap-4 p-4">
      <BookCover book={book} className="w-20 shrink-0 sm:w-24" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{L.continueTitle}</div>
        <div className="mt-1 line-clamp-2 text-lg font-bold leading-snug" dir="auto">{book.title}</div>
        {book.author && <div className="truncate text-sm text-muted" dir="auto">{book.author}</div>}
        <div className="mt-2 text-xs text-muted tabular">{line}</div>
        <ProgressBar value={bookProgress(book, page)} className="mt-1.5 max-w-xs" />
        <div className="relative z-10 mt-3 flex gap-2">
          {here
            ? <Button size="sm" variant="primary" onClick={() => openReader(book.id)}><BookOpen size={15} /> {L.continue}</Button>
            : <Button size="sm" variant="primary" onClick={() => openBook(book.id)}>{book.file ? L.pickFile : L.updatePage}</Button>}
        </div>
      </div>
      <button onClick={() => openBook(book.id)} aria-label={book.title} className="absolute inset-0 rounded-2xl" />
    </Card>
  )
}

function BookDetails({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useI18n()
  const L = t.m.library
  const book = useStore((s) => s.books.find((b) => b.id === id))
  const open = !!id && !!book
  return (
    <Modal open={open} onClose={onClose} title={L.details} wide>
      {book && <DetailsBody book={book} onClose={onClose} />}
    </Modal>
  )
}

function DetailsBody({ book, onClose }: { book: Book; onClose: () => void }) {
  const t = useI18n()
  const L = t.m.library
  const s = useStore()
  const page = placeOf(book.id, s.bookPlaces)
  const here = useFiles((f) => (book.file ? f.here?.has(book.file.hash) ?? false : false))
  const area = useAreaMap().get(book.areaId ?? '')
  const marks = s.bookmarks.filter((m) => m.bookId === book.id).sort((a, b) => a.page - b.page)
  const totals = readingTotals(s.readingSessions, book.id)
  const line = usePlaceLine(book)
  const [to, setTo] = useState('')
  const [mins, setMins] = useState('')

  const read = (p?: number) => { onClose(); openReader(book.id, p) }
  const remove = () => {
    if (!confirm(t.f(L.deleteConfirm, { title: book.title }))) return
    const hash = book.file?.hash
    s.deleteBook(book.id)
    if (hash) void removePdfHere(hash)
    onClose()
    toast({ emoji: '🗑️', message: L.deleted })
  }
  const removeFile = () => {
    if (!book.file || !confirm(L.removeFileConfirm)) return
    void removePdfHere(book.file.hash).then(() => toast({ emoji: '📄', message: L.fileRemoved }))
  }
  const updatePage = () => {
    const p = Math.round(Number(to))
    if (!(p >= 1)) return
    const target = book.pages ? Math.min(p, book.pages) : p
    const now = new Date().toISOString()
    s.saveReadingSession({
      id: uid(), bookId: book.id, date: todayKey(), startedAt: now, minutes: Math.max(0, Math.round(Number(mins) || 0)),
      fromPage: page, toPage: target, pages: pagesForward(page, target),
    })
    s.setBookPlace(book.id, target)
    if (book.status === 'want') s.setBookStatus(book.id, 'reading')
    setTo(''); setMins('')
    if (book.pages && target >= book.pages && book.status !== 'finished') {
      toast({ emoji: '🎉', message: t.f(L.reachedEnd, { title: book.title }), action: { label: L.markFinishedAction, run: () => useStore.getState().setBookStatus(book.id, 'finished') } }, 10000)
    } else toast({ emoji: '📖', message: t.f(L.pageSaved, { page: t.n(target) }) })
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <BookCover book={book} className="w-24 shrink-0 sm:w-28" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-xl font-bold leading-snug" dir="auto">{book.title}</div>
          {book.author && <div className="text-sm text-muted" dir="auto">{book.author}</div>}
          {area && <AreaChip area={area} />}
          <div className="pt-1 text-xs text-muted tabular">{line}</div>
          <ProgressBar value={bookProgress(book, page)} className="max-w-xs" />
        </div>
      </div>

      <Segmented
        value={book.status}
        onChange={(v: BookStatus) => s.setBookStatus(book.id, v)}
        options={BOOK_STATUSES.map((st) => ({ value: st, label: L.status[st] }))}
        className="w-full"
      />

      {book.file && (here
        ? <Button variant="primary" className="w-full" onClick={() => read()}>
            <BookOpen size={16} /> {page > 1 ? t.f(L.readFrom, { page: t.n(page) }) : L.read}
          </Button>
        : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm">
            <div className="font-semibold">{L.noFileHere}</div>
            <div className="mt-1 text-muted">{t.f(L.noFileHereHint, { page: t.n(Math.max(1, page)) })}</div>
            <Button className="mt-3" variant="primary" size="sm" onClick={() => pickPdfs((f) => void addPdfFiles(f, book), false)}>
              <Upload size={14} /> {L.pickFile}
            </Button>
          </div>
        ))}

      {!book.file && book.status !== 'finished' && (
        <div className="rounded-xl bg-surface-2/60 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label>{L.onPage}</Label>
              <Input type="number" inputMode="numeric" min={1} placeholder={page ? String(page) : '1'} value={to} onChange={(e) => setTo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && updatePage()} />
            </div>
            <div>
              <Label>{L.minutesRead}</Label>
              <Input type="number" inputMode="numeric" min={0} placeholder={t.m.common.optional} value={mins} onChange={(e) => setMins(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && updatePage()} />
            </div>
            <Button variant="primary" className="col-span-2 sm:col-span-1" onClick={updatePage} disabled={!to}>{L.updatePage}</Button>
          </div>
        </div>
      )}

      {totals.sessions > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label={L.stats.time} value={t.dur(totals.minutes)} />
          <Stat label={L.stats.pages} value={t.n(totals.pages)} />
          <Stat label={L.stats.days} value={t.n(totals.days)} />
        </div>
      )}

      {book.file && (
        <section>
          <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">{L.reader.bookmarks}</h4>
          {marks.length === 0
            ? <p className="text-sm text-muted">{L.noBookmarks}</p>
            : <ul className="divide-y divide-border rounded-xl border border-border">
                {marks.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                    <button className="min-w-0 flex-1 text-start disabled:cursor-default" disabled={!here} onClick={() => read(m.page)}>
                      <span className="text-sm font-semibold tabular">{t.f(L.reader.pageOnly, { page: t.n(m.page) })}</span>
                      {m.note && <span className="ms-2 text-sm text-muted" dir="auto">{m.note}</span>}
                    </button>
                    <IconButton label={t.m.common.delete} onClick={() => s.deleteBookmark(m.id)}><X size={14} /></IconButton>
                  </li>
                ))}
              </ul>}
        </section>
      )}

      <section>
        <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">{L.links.title}</h4>
        <LinkLines book={book} />
      </section>

      {book.notes && <p className="whitespace-pre-wrap text-sm text-muted" dir="auto">{book.notes}</p>}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button size="sm" onClick={() => { onClose(); editBook(book) }}><Pencil size={14} /> {t.m.common.edit}</Button>
        {!book.file && <Button size="sm" variant="ghost" onClick={() => pickPdfs((f) => void addPdfFiles(f, book), false)}><Upload size={14} /> {L.attachPdf}</Button>}
        {book.file && here && <Button size="sm" variant="ghost" onClick={removeFile}>{L.removeFile}</Button>}
        <Button size="sm" variant="danger" className="ms-auto" onClick={remove}><Trash2 size={14} /> {t.m.common.delete}</Button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2/60 px-2 py-2.5">
      <div className="text-lg font-bold tabular">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  )
}

interface Draft {
  title: string; author: string; pages: string; status: BookStatus; areaId: string | null; color: AreaColor | null; notes: string
  habitId: string; habitCounts: 'pages' | 'minutes'
  /** '' = none, NEW_TASK = make one on save */
  taskId: string; untilPage: string
  goalId: string; goalKind: 'milestone' | 'pages' | 'finished'; milestoneId: string; goalAmount: string
}
const NEW_TASK = '__new'

/** The links a draft describes (ADR-047); a link to something no longer there is dropped. */
function draftLinks(d: Draft, s: ReturnType<typeof useStore.getState>, title: string): Pick<Book, 'habit' | 'task' | 'goal'> {
  const habit = d.habitId && s.habits.some((h) => h.id === d.habitId) ? { habitId: d.habitId, counts: d.habitCounts } : null
  let taskId = d.taskId && (d.taskId === NEW_TASK || s.tasks.some((x) => x.id === d.taskId)) ? d.taskId : ''
  const until = Math.round(Number(d.untilPage)) > 0 ? Math.round(Number(d.untilPage)) : null
  if (taskId === NEW_TASK) {
    const tt = tx()
    taskId = s.addTask({ title: until ? tt.f(tt.m.library.links.newTaskUntil, { title, page: tt.n(until) }) : tt.f(tt.m.library.links.newTaskTitle, { title }), date: todayKey() })
  }
  const g = d.goalId ? s.goals.find((x) => x.id === d.goalId) : undefined
  let goal: Book['goal'] = null
  if (g?.kind === 'milestones') {
    if (g.milestones.some((m) => m.id === d.milestoneId)) goal = { goalId: g.id, kind: 'milestone', milestoneId: d.milestoneId }
  } else if (g) {
    goal = d.goalKind === 'pages' ? { goalId: g.id, kind: 'pages' } : { goalId: g.id, kind: 'finished', amount: Number(d.goalAmount) > 0 ? Number(d.goalAmount) : 1 }
  }
  return { habit, task: taskId ? { taskId, untilPage: until } : null, goal }
}

function BookEditor({ value, onClose }: { value: Partial<Book> | null; onClose: () => void }) {
  const t = useI18n()
  const L = t.m.library
  const s = useStore()
  const existing = value?.id ? s.books.find((b) => b.id === value.id) : undefined
  const [d, setD] = useState<Draft>(() => ({
    title: value?.title ?? '', author: value?.author ?? '', pages: value?.pages ? String(value.pages) : '',
    status: value?.status ?? 'want', areaId: value?.areaId ?? null, color: value?.color ?? null, notes: value?.notes ?? '',
    habitId: value?.habit?.habitId ?? '', habitCounts: value?.habit?.counts ?? 'pages',
    taskId: value?.task?.taskId ?? '', untilPage: value?.task?.untilPage ? String(value.task.untilPage) : '',
    goalId: value?.goal?.goalId ?? '', goalKind: value?.goal?.kind ?? 'finished',
    milestoneId: value?.goal?.kind === 'milestone' ? value.goal.milestoneId : '', goalAmount: value?.goal?.kind === 'finished' ? String(value.goal.amount) : '1',
  }))
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const save = () => {
    if (!d.title.trim()) return
    const pages = existing?.file ? existing.pages : (Math.round(Number(d.pages)) > 0 ? Math.round(Number(d.pages)) : null)
    const fields = { title: d.title.trim(), author: d.author.trim(), pages, areaId: d.areaId, color: d.color, notes: d.notes.trim(), ...draftLinks(d, s, d.title.trim()) }
    if (existing) {
      s.updateBook(existing.id, fields)
      s.setBookStatus(existing.id, d.status)
      settleBookLinks(existing.id)
      onClose()
      openBook(existing.id)
    } else {
      const id = s.addBook({ ...fields, status: 'want' })
      s.setBookStatus(id, d.status)
      settleBookLinks(id)
      onClose()
      toast({ emoji: '📚', message: t.f(L.addedOne, { title: fields.title }) })
    }
  }
  return (
    <Modal
      open={!!value}
      onClose={onClose}
      title={existing ? L.editor.editTitle : L.editor.newTitle}
      footer={<><Button variant="ghost" onClick={onClose}>{t.m.common.cancel}</Button><Button variant="primary" onClick={save} disabled={!d.title.trim()}>{existing ? t.m.common.save : L.editor.create}</Button></>}
    >
      <div className="space-y-4">
        <div><Label>{L.editor.title}</Label><Input autoFocus dir="auto" value={d.title} onChange={(e) => set('title', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder={L.editor.titlePlaceholder} /></div>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <div><Label>{L.editor.author}</Label><Input dir="auto" value={d.author} onChange={(e) => set('author', e.target.value)} placeholder={t.m.common.optional} /></div>
          <div>
            <Label>{L.editor.pages}</Label>
            {existing?.file
              ? <div className="flex h-10 items-center text-sm text-muted tabular">{existing.pages ? t.n(existing.pages) : '—'}</div>
              : <Input type="number" inputMode="numeric" min={1} value={d.pages} onChange={(e) => set('pages', e.target.value)} placeholder={t.m.common.optional} />}
          </div>
        </div>
        {existing?.file && <p className="-mt-2 text-xs text-muted">{t.f(L.editor.fileName, { name: existing.file.name })}</p>}
        <div>
          <Label>{L.editor.status}</Label>
          <Segmented value={d.status} onChange={(v: BookStatus) => set('status', v)} options={BOOK_STATUSES.map((st) => ({ value: st, label: L.status[st] }))} className="w-full" />
        </div>
        <div><Label>{L.editor.area}</Label><AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} /></div>
        {!existing?.file && (
          <div>
            <Label>{L.editor.color}</Label>
            <div className="flex flex-wrap gap-2">
              <Dot on={d.color === null} label={L.editor.noColor} onClick={() => set('color', null)} />
              {AREA_COLORS.map((c) => <Dot key={c} on={d.color === c} label={t.m.settings.areas.colours[c]} hex={AREA_HEX[c]} onClick={() => set('color', c)} />)}
            </div>
          </div>
        )}
        <div><Label>{L.editor.notes}</Label><Textarea dir="auto" rows={3} value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder={L.editor.notesPlaceholder} /></div>
        <LinksEditor d={d} set={set} />
      </div>
    </Modal>
  )
}

function Dot({ on, label, hex, onClick }: { on: boolean; label: string; hex?: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label} aria-pressed={on} title={label}
      className={cx('grid size-8 place-items-center rounded-full border transition', on ? 'scale-110 ring-2 ring-text/40 ring-offset-2 ring-offset-surface' : 'hover:scale-110', hex ? 'border-transparent' : 'border-border bg-surface-2')}
      style={hex ? { background: hex } : undefined}
    >
      {!hex && <X size={14} className="text-muted" />}
    </button>
  )
}

/** What reading this book counts toward — each optional, chosen by the owner (ADR-047). */
function LinksEditor({ d, set }: { d: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  const t = useI18n()
  const L = t.m.library.links
  const habits = useStore((s) => s.habits)
  const tasks = useStore((s) => s.tasks)
  const goals = useStore((s) => s.goals)
  const liveHabits = habits.filter((h) => !h.archived || h.id === d.habitId)
  const openTasks = tasks.filter((x) => !x.done || x.id === d.taskId)
  const liveGoals = goals.filter((g) => g.status === 'active' || g.id === d.goalId)
  const goal = goals.find((g) => g.id === d.goalId)
  const pickHabit = (id: string) => {
    set('habitId', id)
    const h = habits.find((x) => x.id === id)
    if (h) set('habitCounts', countsMinutes(h) ? 'minutes' : 'pages')
  }
  const pickGoal = (id: string) => {
    set('goalId', id)
    const g = goals.find((x) => x.id === id)
    if (g?.kind === 'milestones') set('milestoneId', g.milestones.find((m) => !m.done)?.id ?? g.milestones[0]?.id ?? '')
  }
  return (
    <section className="space-y-4 rounded-2xl border border-border p-4">
      <div>
        <div className="text-sm font-bold">{L.title}</div>
        <p className="text-xs text-muted">{L.hint}</p>
      </div>

      <div>
        <Label>{L.habit}</Label>
        <Select value={d.habitId} onChange={(e) => pickHabit(e.target.value)}>
          <option value="">{L.noHabit}</option>
          {liveHabits.map((h) => <option key={h.id} value={h.id}>{h.emoji} {h.name}</option>)}
        </Select>
        {d.habitId && (
          <Segmented className="mt-2 w-full" value={d.habitCounts} onChange={(v: 'pages' | 'minutes') => set('habitCounts', v)}
            options={[{ value: 'pages', label: L.countsPages }, { value: 'minutes', label: L.countsMinutes }]} />
        )}
      </div>

      <div>
        <Label>{L.task}</Label>
        <Select value={d.taskId} onChange={(e) => set('taskId', e.target.value)}>
          <option value="">{L.noTask}</option>
          <option value={NEW_TASK}>{L.newTask}</option>
          {openTasks.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </Select>
        {d.taskId && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="shrink-0 text-muted">{L.doneAtPage}</span>
            <Input type="number" inputMode="numeric" min={1} className="w-28" value={d.untilPage} onChange={(e) => set('untilPage', e.target.value)} placeholder={L.whenFinished} />
          </div>
        )}
      </div>

      <div>
        <Label>{L.goal}</Label>
        <Select value={d.goalId} onChange={(e) => pickGoal(e.target.value)}>
          <option value="">{L.noGoal}</option>
          {liveGoals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </Select>
        {goal?.kind === 'milestones' && (
          <div className="mt-2">
            <Label>{L.milestone}</Label>
            <Select value={d.milestoneId} onChange={(e) => set('milestoneId', e.target.value)}>
              {goal.milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </Select>
          </div>
        )}
        {goal && goal.kind === 'numeric' && (
          <div className="mt-2 space-y-2">
            <Segmented className="w-full" value={d.goalKind === 'pages' ? 'pages' : 'finished'} onChange={(v: 'pages' | 'finished') => set('goalKind', v)}
              options={[{ value: 'finished', label: L.goalFinished }, { value: 'pages', label: L.goalPages }]} />
            {d.goalKind !== 'pages' && (
              <div className="flex items-center gap-2 text-sm">
                <span className="shrink-0 text-muted">{L.adds}</span>
                <Input type="number" inputMode="decimal" min={0} className="w-24" value={d.goalAmount} onChange={(e) => set('goalAmount', e.target.value)} />
                <span className="truncate text-muted" dir="auto">{goal.unit}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/** One line per link in the book's details: what reading it counts toward. */
function LinkLines({ book }: { book: Book }) {
  const t = useI18n()
  const L = t.m.library.links
  const habit = useStore((s) => (book.habit ? s.habits.find((h) => h.id === book.habit!.habitId) : undefined))
  const task = useStore((s) => (book.task ? s.tasks.find((x) => x.id === book.task!.taskId) : undefined))
  const goal = useStore((s) => (book.goal ? s.goals.find((g) => g.id === book.goal!.goalId) : undefined))
  const lines: { key: string; icon: React.ReactNode; text: string }[] = []
  if (habit && book.habit) lines.push({ key: 'h', icon: <Repeat size={14} />, text: t.f(book.habit.counts === 'minutes' ? L.lineHabitMinutes : L.lineHabitPages, { name: `${habit.emoji} ${habit.name}` }) })
  if (task && book.task) lines.push({ key: 't', icon: <CheckSquare size={14} />, text: book.task.untilPage ? t.f(L.lineTaskPage, { name: task.title, page: t.n(book.task.untilPage) }) : t.f(L.lineTaskFinished, { name: task.title }) })
  if (goal && book.goal) {
    const ms = book.goal.kind === 'milestone' ? goal.milestones.find((m) => m.id === (book.goal as { milestoneId: string }).milestoneId) : undefined
    lines.push({
      key: 'g', icon: <Target size={14} />,
      text: book.goal.kind === 'milestone' ? t.f(L.lineGoalMilestone, { name: goal.title, milestone: ms?.title ?? '' })
        : book.goal.kind === 'pages' ? t.f(L.lineGoalPages, { name: goal.title })
        : t.f(L.lineGoalFinished, { name: goal.title, amount: t.n(book.goal.amount), unit: goal.unit }),
    })
  }
  if (!lines.length) return <p className="text-xs text-muted">{L.none}</p>
  return (
    <ul className="space-y-1.5">
      {lines.map((l) => <li key={l.key} className="flex items-start gap-2 text-sm"><span className="mt-0.5 text-accent">{l.icon}</span><span dir="auto">{l.text}</span></li>)}
    </ul>
  )
}
