import { format } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { BellRing, CalendarPlus, Check, CheckCircle2, Pencil, Plus, Send, Star, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmojiInput } from '../components/EmojiInput'
import { Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, Segmented, SectionTitle, Select, Textarea } from '../components/ui'
import { diffDays, fromKey } from '../lib/date'
import { useTick, useToday } from '../lib/hooks'
import { sendTestNotification, useNotifier } from '../lib/notifier'
import { ALERT_OPTIONS, alertLabel, nextOccurrence, REPEAT_LABEL, whenText, yearsOn } from '../lib/reminders'
import { openICS } from '../lib/ics'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Reminder, ReminderRepeat } from '../lib/types'

type Draft = Omit<Reminder, 'id' | 'createdAt' | 'done'>

const TEMPLATES: { label: string; draft: Partial<Draft> }[] = [
  { label: '🎂 Birthday', draft: { emoji: '🎂', repeat: 'yearly', time: null, alerts: [0, 10080] } },
  { label: '💍 Anniversary', draft: { emoji: '💍', repeat: 'yearly', time: null, alerts: [0, 10080] } },
  { label: '⏰ Deadline', draft: { emoji: '⏰', repeat: 'none', time: '17:00', alerts: [0, 1440], important: true } },
  { label: '💳 Monthly bill', draft: { emoji: '💳', repeat: 'monthly', time: null, alerts: [0, 4320] } },
  { label: '📞 Call someone', draft: { emoji: '📞', repeat: 'weekly', time: '20:00', alerts: [0] } },
]

export interface UpcomingItem { r: Reminder; occ: string; days: number }

/** Reminders by their next occurrence, soonest first (overdue one-offs first of all). */
export function upcoming(reminders: Reminder[], now: Date, today: string): UpcomingItem[] {
  return reminders
    .filter((r) => !(r.repeat === 'none' && r.done))
    .map((r) => { const occ = nextOccurrence(r, now); return { r, occ, days: diffDays(occ, today) } })
    .sort((a, b) => a.days - b.days || (a.r.time ?? '').localeCompare(b.r.time ?? ''))
}

export function RemindersPage() {
  const today = useToday()
  const now = new Date(useTick(60_000))
  const reminders = useStore((s) => s.reminders)
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null)
  const [template, setTemplate] = useState<Partial<Draft> | undefined>()
  const [showDone, setShowDone] = useState(false)

  const list = useMemo(() => upcoming(reminders, now, today), [reminders, now, today])
  const overdue = list.filter((x) => x.days < 0)
  const todays = list.filter((x) => x.days === 0)
  const week = list.filter((x) => x.days > 0 && x.days <= 7)
  const later = list.filter((x) => x.days > 7)
  const done = reminders.filter((r) => r.repeat === 'none' && r.done)

  const openNew = (t?: Partial<Draft>) => { setTemplate(t); setEditing('new') }

  return (
    <div>
      <PageHeader
        title="Reminders"
        subtitle="Important dates and things not to forget — with desktop notifications."
        right={
          <div className="flex gap-2">
            {reminders.length > 0 && <Button onClick={() => openICS(reminders)} title="Adds all reminders to your phone or computer calendar, with alerts"><CalendarPlus size={16} /> Add all to Calendar</Button>}
            <Button variant="primary" onClick={() => openNew()}><Plus size={16} /> New reminder</Button>
          </div>
        }
      />

      <NotifierStatus />

      <div className="mb-6 flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button key={t.label} onClick={() => openNew(t.draft)} className="rounded-xl border border-border bg-surface/80 px-3 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent">
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 && done.length === 0 ? (
        <EmptyState emoji="🔔" title="Nothing to remember yet">
          Birthdays, anniversaries, deadlines, bills, appointments — add them once and Itqan will remind you, every year if needed.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <Section title="Overdue" items={overdue} onEdit={setEditing} danger />
          <Section title="Today" items={todays} onEdit={setEditing} />
          <Section title="Next 7 days" items={week} onEdit={setEditing} />
          <Section title="Later" items={later} onEdit={setEditing} />
          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone((s) => !s)} className="text-xs font-bold uppercase tracking-wider text-muted hover:text-text">
                {showDone ? 'Hide' : 'Show'} done · {done.length}
              </button>
              {showDone && (
                <Card className="mt-2 divide-y divide-border">
                  {done.map((r) => <Row key={r.id} item={{ r, occ: r.date, days: diffDays(r.date, today) }} onEdit={() => setEditing(r)} />)}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      <ReminderEditor reminder={editing} template={template} onClose={() => { setEditing(null); setTemplate(undefined) }} />
    </div>
  )
}

function NotifierStatus() {
  const { state, next } = useNotifier()
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'denied'))

  const test = async () => {
    const ok = await sendTestNotification()
    if (!ok && state !== 'connected') toast({ emoji: 'ℹ️', message: 'Shown inside Itqan only — desktop alerts need the helper' })
  }

  const box = (tone: 'ok' | 'warn' | 'info', icon: React.ReactNode, title: string, body: React.ReactNode) => (
    <Card className={cx('mb-6 flex flex-wrap items-center gap-4 p-4', tone === 'ok' && 'border-accent/40', tone === 'warn' && 'border-amber-500/40')}>
      <div className={cx('grid size-10 place-items-center rounded-xl', tone === 'ok' ? 'bg-accent-soft text-accent' : tone === 'warn' ? 'bg-amber-500/10 text-amber-500' : 'bg-surface-2 text-muted')}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-muted">{body}</div>
      </div>
      <Button size="sm" onClick={test}><Send size={13} /> Test</Button>
    </Card>
  )

  if (state === 'connected') {
    return box('ok', <BellRing size={18} />, 'Desktop notifications are on',
      next ? `They arrive even when Itqan is closed. Next alert: ${format(new Date(next), 'EEE, MMM d · HH:mm')}.` : 'They arrive even when Itqan is closed.')
  }
  if (state === 'offline' || state === 'unauthorized') {
    return box('warn', <TriangleAlert size={18} />, state === 'offline' ? 'The notification helper is not running' : 'The notification helper rejected this app',
      <>Run <code className="rounded bg-surface-2 px-1">~/Itqan/scripts/install_local.sh</code> once to (re)install it. Until then, alerts show only while Itqan is open.</>)
  }
  if (state === 'checking') return box('info', <BellRing size={18} />, 'Connecting to desktop notifications…', '')
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return box('info', <BellRing size={18} />, 'On iPhone, let Calendar remind you',
      'Tap “Add all to Calendar” — your iPhone’s Calendar then alerts you even when Itqan is closed. Add new reminders later with the calendar button on each one.')
  }
  return box('info', <BellRing size={18} />, 'Alerts show while Itqan is open',
    <>Desktop notifications when the app is closed come with the installed local app.{' '}
      {perm === 'default' && <button className="font-semibold text-accent" onClick={() => Notification.requestPermission().then(setPerm)}>Allow browser notifications</button>}</>)
}

function Section({ title, items, onEdit, danger }: { title: string; items: UpcomingItem[]; onEdit: (r: Reminder) => void; danger?: boolean }) {
  if (!items.length) return null
  return (
    <section>
      <SectionTitle><span className={danger ? 'text-danger' : ''}>{title} · {items.length}</span></SectionTitle>
      <Card className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {items.map((x) => <Row key={x.r.id} item={x} onEdit={() => onEdit(x.r)} />)}
        </AnimatePresence>
      </Card>
    </section>
  )
}

function Row({ item: { r, occ, days }, onEdit }: { item: UpcomingItem; onEdit: () => void }) {
  const update = useStore((s) => s.updateReminder)
  const remove = useStore((s) => s.deleteReminder)
  const restore = useStore((s) => s.restoreReminder)
  const years = yearsOn(r, occ)
  const soon = days >= 0 && days <= 1

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="group flex flex-wrap items-center gap-x-3 gap-y-1 p-3 sm:flex-nowrap">
      <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl">
        {r.emoji || '🔔'}
        {r.important && <Star size={12} className="absolute -right-1 -top-1 fill-gold text-gold" />}
      </div>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className={cx('font-semibold sm:truncate', r.done && 'text-muted line-through')}>{r.title}</div>
        <div className={cx('text-xs', days < 0 && !r.done ? 'font-semibold text-danger' : soon ? 'font-semibold text-accent' : 'text-muted')}>
          {whenText(r, occ, new Date())}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted">
          <span>{REPEAT_LABEL[r.repeat]}</span>
          {years && <span>· {years} year{years === 1 ? '' : 's'}</span>}
          {r.alerts.length > 0 && <span>· 🔔 {r.alerts.slice().sort((a, b) => b - a).map((a) => alertLabel(a, r.time === null)).join(', ')}</span>}
        </div>
      </button>
      {days >= 0 && days <= 60 && (
        <div className="hidden text-right sm:block">
          <div className="text-xl font-extrabold tabular">{days === 0 ? 'Today' : days}</div>
          {days > 0 && <div className="text-[10px] font-semibold uppercase text-muted">day{days === 1 ? '' : 's'}</div>}
        </div>
      )}
      <div className="-mb-1 ml-auto flex w-full justify-end border-t border-border/60 pt-1 transition sm:mb-0 sm:w-auto sm:border-0 sm:pt-0 sm:opacity-0 sm:group-hover:opacity-100">
        {r.repeat === 'none' && (
          <IconButton label={r.done ? 'Mark not done' : 'Mark done'} onClick={() => update(r.id, { done: !r.done })}>
            {r.done ? <CheckCircle2 size={15} /> : <Check size={15} />}
          </IconButton>
        )}
        <IconButton label="Add to Calendar" onClick={() => openICS([r], r.title.replace(/[^\w-]+/g, '-').toLowerCase() || 'reminder')}><CalendarPlus size={14} /></IconButton>
        <IconButton label="Edit" onClick={onEdit}><Pencil size={14} /></IconButton>
        <IconButton label="Delete" className="hover:text-danger" onClick={() => {
          const x = remove(r.id)
          if (x) toast({ emoji: '🗑️', message: `Deleted “${x.title}”`, action: { label: 'Undo', run: () => restore(x) } }, 8000)
        }}><Trash2 size={14} /></IconButton>
      </div>
    </motion.div>
  )
}

export function ReminderEditor({ reminder, template, onClose }: { reminder: Reminder | 'new' | null; template?: Partial<Draft>; onClose: () => void }) {
  const contacts = useStore((s) => s.contacts)
  const today = useToday()
  const add = useStore((s) => s.addReminder)
  const update = useStore((s) => s.updateReminder)
  const existing = reminder && reminder !== 'new' ? reminder : null
  const blank: Draft = { title: '', notes: '', emoji: '🔔', date: today, time: '09:00', repeat: 'none', alerts: [0], important: false, contactId: null, countYears: true }
  const [d, setD] = useState<Draft>(blank)

  useEffect(() => {
    if (!reminder) return
    setD(existing ? { ...existing } : { ...blank, ...template })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminder])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const allDay = d.time === null
  const toggleAlert = (m: number) => set('alerts', d.alerts.includes(m) ? d.alerts.filter((x) => x !== m) : [...d.alerts, m])

  const save = () => {
    if (!d.title.trim()) return
    const clean = { ...d, title: d.title.trim(), alerts: d.alerts.length ? d.alerts : [0] }
    if (existing) update(existing.id, clean)
    else { add(clean); toast({ emoji: '🔔', message: `I'll remind you: ${clean.title}` }) }
    onClose()
  }

  return (
    <Modal
      open={reminder !== null}
      onClose={onClose}
      title={existing ? 'Edit reminder' : 'New reminder'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={!d.title.trim()}>{existing ? 'Save' : 'Add reminder'}</Button></>}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={d.emoji} onChange={(v) => set('emoji', v)} />
          <Input autoFocus placeholder={d.repeat === 'yearly' ? 'e.g. Mum’s birthday' : 'What should I remind you of?'} value={d.title} onChange={(e) => set('title', e.target.value)} className="h-10 font-semibold" />
        </div>
        <div>
          <Label>Repeats</Label>
          <Segmented<ReminderRepeat>
            value={d.repeat}
            onChange={(v) => set('repeat', v)}
            options={(['none', 'daily', 'weekly', 'monthly', 'yearly'] as ReminderRepeat[]).map((v) => ({ value: v, label: REPEAT_LABEL[v] }))}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label hint={d.repeat === 'yearly' ? 'the original date, e.g. birth year' : undefined}>Date</Label>
            <Input type="date" value={d.date} onChange={(e) => set('date', e.target.value || today)} className="w-auto" />
          </div>
          <div>
            <Label>Time</Label>
            <div className="flex items-center gap-2">
              <Input type="time" value={d.time ?? ''} disabled={allDay} onChange={(e) => set('time', e.target.value || '09:00')} className="w-auto disabled:opacity-40" />
              <button type="button" onClick={() => set('time', allDay ? '09:00' : null)} className={cx('h-10 rounded-xl px-3 text-xs font-semibold transition', allDay ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted')}>
                All day
              </button>
            </div>
          </div>
        </div>
        {d.repeat === 'yearly' && d.date < today && (
          <p className="-mt-2 text-xs text-muted">Next: {format(fromKey(nextOccurrence({ ...d, id: '', createdAt: '', done: false }, new Date())), 'EEE, MMM d, yyyy')}</p>
        )}
        <div>
          <Label>Remind me</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALERT_OPTIONS.map((o) => (
              <button
                key={o.minutes}
                type="button"
                onClick={() => toggleAlert(o.minutes)}
                className={cx('rounded-lg px-2.5 py-1.5 text-xs font-semibold transition', d.alerts.includes(o.minutes) ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted hover:text-text')}
              >
                {alertLabel(o.minutes, allDay)}
              </button>
            ))}
          </div>
          {allDay && <p className="mt-1.5 text-[11px] text-muted">All-day reminders alert at 09:00.</p>}
        </div>
        {d.repeat === 'yearly' && (
          <label className="-mt-1 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={d.countYears} onChange={(e) => set('countYears', e.target.checked)} className="accent-[var(--accent)]" />
            Count the years (“30 years”) — untick if the year is unknown
          </label>
        )}
        {contacts.length > 0 && (
          <div>
            <Label hint="optional">About someone</Label>
            <Select value={d.contactId ?? ''} onChange={(e) => set('contactId', e.target.value || null)}>
              <option value="">Nobody in particular</option>
              {contacts.filter((c) => !c.archived || c.id === d.contactId).sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}
        <button type="button" onClick={() => set('important', !d.important)} className={cx('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', d.important ? 'border-gold/60 bg-amber-500/10' : 'border-border')}>
          <Star size={18} className={d.important ? 'fill-gold text-gold' : 'text-muted'} />
          <span>
            <span className="block text-sm font-semibold">Important</span>
            <span className="block text-xs text-muted">The notification stays on screen until you dismiss it.</span>
          </span>
        </button>
        <div><Label>Notes</Label><Textarea placeholder="Gift idea, address, what to prepare…" value={d.notes} onChange={(e) => set('notes', e.target.value)} className="min-h-16" /></div>
      </div>
    </Modal>
  )
}
