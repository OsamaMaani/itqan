import { format } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { BellRing, CalendarPlus, Check, CheckCircle2, Pencil, Plus, Send, Star, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmojiInput } from '../components/EmojiInput'
import { Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, Segmented, SectionTitle, Select, Textarea } from '../components/ui'
import { rich, useI18n } from '../i18n/react'
import { diffDays } from '../lib/date'
import { useTick, useToday } from '../lib/hooks'
import { sendTestNotification, useNotifier } from '../lib/notifier'
import { ALERT_MINUTES, alertLabel, nextOccurrence, REMINDER_ALL_DAY_TIME, whenText, yearsOn } from '../lib/reminders'
import { openICS } from '../lib/ics'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Reminder, ReminderRepeat } from '../lib/types'

type Draft = Omit<Reminder, 'id' | 'createdAt' | 'done'>

const TEMPLATES: { key: 'birthday' | 'anniversary' | 'deadline' | 'bill' | 'call'; emoji: string; draft: Partial<Draft> }[] = [
  { key: 'birthday', emoji: '🎂', draft: { emoji: '🎂', repeat: 'yearly', time: null, alerts: [0, 10080] } },
  { key: 'anniversary', emoji: '💍', draft: { emoji: '💍', repeat: 'yearly', time: null, alerts: [0, 10080] } },
  { key: 'deadline', emoji: '⏰', draft: { emoji: '⏰', repeat: 'none', time: '17:00', alerts: [0, 1440], important: true } },
  { key: 'bill', emoji: '💳', draft: { emoji: '💳', repeat: 'monthly', time: null, alerts: [0, 4320] } },
  { key: 'call', emoji: '📞', draft: { emoji: '📞', repeat: 'weekly', time: '20:00', alerts: [0] } },
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
  const t = useI18n()
  const { m } = t
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

  const openNew = (tpl?: Partial<Draft>) => { setTemplate(tpl); setEditing('new') }

  return (
    <div>
      <PageHeader
        title={m.reminders.title}
        subtitle={m.reminders.subtitle}
        right={
          <div className="flex gap-2">
            {reminders.length > 0 && <Button onClick={() => openICS(reminders)} title={m.reminders.addAllHint}><CalendarPlus size={16} /> {m.reminders.addAll}</Button>}
            <Button variant="primary" onClick={() => openNew()}><Plus size={16} /> {m.reminders.newReminder}</Button>
          </div>
        }
      />

      <NotifierStatus />

      <div className="mb-6 flex flex-wrap gap-2">
        {TEMPLATES.map((tpl) => (
          <button key={tpl.key} onClick={() => openNew(tpl.draft)} className="rounded-xl border border-border bg-surface/80 px-3 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent">
            {tpl.emoji} {m.reminders.templates[tpl.key]}
          </button>
        ))}
      </div>

      {list.length === 0 && done.length === 0 ? (
        <EmptyState emoji="🔔" title={m.reminders.emptyTitle}>
          {m.reminders.emptyBody}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <Section title={m.reminders.sections.overdue} items={overdue} onEdit={setEditing} danger />
          <Section title={m.reminders.sections.today} items={todays} onEdit={setEditing} />
          <Section title={m.reminders.sections.week} items={week} onEdit={setEditing} />
          <Section title={m.reminders.sections.later} items={later} onEdit={setEditing} />
          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone((s) => !s)} className="text-xs font-bold uppercase tracking-wider text-muted hover:text-text">
                {t.f(showDone ? m.reminders.hideDone : m.reminders.showDone, { n: done.length })}
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
  const t = useI18n()
  const n = t.m.reminders.notifier
  const { state, next } = useNotifier()
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'denied'))

  const test = async () => {
    const ok = await sendTestNotification()
    if (!ok && state !== 'connected') toast({ emoji: 'ℹ️', message: n.testShownInside })
  }

  const box = (tone: 'ok' | 'warn' | 'info', icon: React.ReactNode, title: string, body: React.ReactNode) => (
    <Card className={cx('mb-6 flex flex-wrap items-center gap-4 p-4', tone === 'ok' && 'border-accent/40', tone === 'warn' && 'border-amber-500/40')}>
      <div className={cx('grid size-10 place-items-center rounded-xl', tone === 'ok' ? 'bg-accent-soft text-accent' : tone === 'warn' ? 'bg-amber-500/10 text-amber-500' : 'bg-surface-2 text-muted')}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-muted">{body}</div>
      </div>
      <Button size="sm" onClick={test}><Send size={13} /> {n.test}</Button>
    </Card>
  )

  if (state === 'connected') {
    return box('ok', <BellRing size={18} />, n.onTitle,
      next ? t.f(n.onBodyNext, { when: `${t.d(new Date(next), 'weekdayShort')} · ${t.time(format(new Date(next), 'HH:mm'))}` }) : n.onBody)
  }
  if (state === 'offline' || state === 'unauthorized') {
    return box('warn', <TriangleAlert size={18} />, state === 'offline' ? n.offlineTitle : n.rejectedTitle,
      rich(n.helperBody, { script: <code dir="ltr" className="rounded bg-surface-2 px-1">~/Itqan/scripts/install_local.sh</code> }))
  }
  if (state === 'checking') return box('info', <BellRing size={18} />, n.checking, '')
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return box('info', <BellRing size={18} />, n.iphoneTitle, t.f(n.iphoneBody, { button: t.m.reminders.addAll }))
  }
  return box('info', <BellRing size={18} />, n.openTitle,
    <>{n.openBody}{' '}
      {perm === 'default' && <button className="font-semibold text-accent" onClick={() => Notification.requestPermission().then(setPerm)}>{n.allowBrowser}</button>}</>)
}

function Section({ title, items, onEdit, danger }: { title: string; items: UpcomingItem[]; onEdit: (r: Reminder) => void; danger?: boolean }) {
  const t = useI18n()
  if (!items.length) return null
  return (
    <section>
      <SectionTitle><span className={danger ? 'text-danger' : ''}>{t.f(t.m.reminders.sectionTitle, { title, n: items.length })}</span></SectionTitle>
      <Card className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {items.map((x) => <Row key={x.r.id} item={x} onEdit={() => onEdit(x.r)} />)}
        </AnimatePresence>
      </Card>
    </section>
  )
}

function Row({ item: { r, occ, days }, onEdit }: { item: UpcomingItem; onEdit: () => void }) {
  const t = useI18n()
  const { m } = t
  const update = useStore((s) => s.updateReminder)
  const remove = useStore((s) => s.deleteReminder)
  const restore = useStore((s) => s.restoreReminder)
  const years = yearsOn(r, occ)
  const soon = days >= 0 && days <= 1

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="group flex flex-wrap items-center gap-x-3 gap-y-1 p-3 sm:flex-nowrap">
      <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl">
        {r.emoji || '🔔'}
        {r.important && <Star size={12} className="absolute -end-1 -top-1 fill-gold text-gold" />}
      </div>
      <button onClick={onEdit} className="min-w-0 flex-1 text-start">
        <div className={cx('font-semibold sm:truncate', r.done && 'text-muted line-through')}>{r.title}</div>
        <div className={cx('text-xs', days < 0 && !r.done ? 'font-semibold text-danger' : soon ? 'font-semibold text-accent' : 'text-muted')}>
          {whenText(r, occ, new Date(), t)}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted">
          <span>{m.reminders.repeat[r.repeat]}</span>
          {years && <span>· {t.p(m.reminders.years, years)}</span>}
          {r.alerts.length > 0 && <span>· 🔔 {t.list(r.alerts.slice().sort((a, b) => b - a).map((a) => alertLabel(a, r.time === null, t)))}</span>}
        </div>
      </button>
      {days >= 0 && days <= 60 && (
        <div className="hidden text-end sm:block">
          <div className="text-xl font-extrabold tabular">{days === 0 ? m.time.today : t.n(days)}</div>
          {days > 0 && <div className="text-[10px] font-semibold uppercase text-muted">{t.p(m.reminders.row.daysUnit, days)}</div>}
        </div>
      )}
      <div className="-mb-1 ms-auto flex w-full justify-end border-t border-border/60 pt-1 transition sm:mb-0 sm:w-auto sm:border-0 sm:pt-0 sm:opacity-0 sm:group-hover:opacity-100">
        {r.repeat === 'none' && (
          <IconButton label={r.done ? m.reminders.row.markNotDone : m.reminders.row.markDone} onClick={() => update(r.id, { done: !r.done })}>
            {r.done ? <CheckCircle2 size={15} /> : <Check size={15} />}
          </IconButton>
        )}
        <IconButton label={m.reminders.row.addToCalendar} onClick={() => openICS([r], r.title.replace(/[^\w-]+/g, '-').toLowerCase() || 'reminder')}><CalendarPlus size={14} /></IconButton>
        <IconButton label={m.common.edit} onClick={onEdit}><Pencil size={14} /></IconButton>
        <IconButton label={m.common.delete} className="hover:text-danger" onClick={() => {
          const x = remove(r.id)
          if (x) toast({ emoji: '🗑️', message: t.f(m.reminders.row.deleted, { title: x.title }), action: { label: m.common.undo, run: () => restore(x) } }, 8000)
        }}><Trash2 size={14} /></IconButton>
      </div>
    </motion.div>
  )
}

export function ReminderEditor({ reminder, template, onClose }: { reminder: Reminder | 'new' | null; template?: Partial<Draft>; onClose: () => void }) {
  const t = useI18n()
  const { m } = t
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
  const toggleAlert = (min: number) => set('alerts', d.alerts.includes(min) ? d.alerts.filter((x) => x !== min) : [...d.alerts, min])

  const save = () => {
    if (!d.title.trim()) return
    const clean = { ...d, title: d.title.trim(), alerts: d.alerts.length ? d.alerts : [0] }
    if (existing) update(existing.id, clean)
    else { add(clean); toast({ emoji: '🔔', message: t.f(m.reminders.editor.added, { title: clean.title }) }) }
    onClose()
  }

  return (
    <Modal
      open={reminder !== null}
      onClose={onClose}
      title={existing ? m.reminders.editor.editTitle : m.reminders.editor.newTitle}
      footer={<><Button variant="ghost" onClick={onClose}>{m.common.cancel}</Button><Button variant="primary" onClick={save} disabled={!d.title.trim()}>{existing ? m.common.save : m.reminders.editor.addButton}</Button></>}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={d.emoji} onChange={(v) => set('emoji', v)} />
          <Input autoFocus placeholder={d.repeat === 'yearly' ? m.reminders.editor.titlePlaceholderYearly : m.reminders.editor.titlePlaceholder} value={d.title} onChange={(e) => set('title', e.target.value)} className="h-10 font-semibold" />
        </div>
        <div>
          <Label>{m.reminders.editor.repeats}</Label>
          <Segmented<ReminderRepeat>
            value={d.repeat}
            onChange={(v) => set('repeat', v)}
            options={(['none', 'daily', 'weekly', 'monthly', 'yearly'] as ReminderRepeat[]).map((v) => ({ value: v, label: m.reminders.repeat[v] }))}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label hint={d.repeat === 'yearly' ? m.reminders.editor.dateHintYearly : undefined}>{m.common.date}</Label>
            <Input type="date" value={d.date} onChange={(e) => set('date', e.target.value || today)} className="w-auto" />
          </div>
          <div>
            <Label>{m.common.time}</Label>
            <div className="flex items-center gap-2">
              <Input type="time" value={d.time ?? ''} disabled={allDay} onChange={(e) => set('time', e.target.value || '09:00')} className="w-auto disabled:opacity-40" />
              <button type="button" onClick={() => set('time', allDay ? '09:00' : null)} className={cx('h-10 rounded-xl px-3 text-xs font-semibold transition', allDay ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted')}>
                {m.reminders.editor.allDay}
              </button>
            </div>
          </div>
        </div>
        {d.repeat === 'yearly' && d.date < today && (
          <p className="-mt-2 text-xs text-muted">{t.f(m.reminders.editor.next, { date: t.d(nextOccurrence({ ...d, id: '', createdAt: '', done: false }, new Date()), 'medium') })}</p>
        )}
        <div>
          <Label>{m.reminders.editor.remindMe}</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALERT_MINUTES.map((min) => ({ min, label: alertLabel(min, allDay, t) })).map((o) => (
              <button
                key={o.min}
                type="button"
                onClick={() => toggleAlert(o.min)}
                className={cx('rounded-lg px-2.5 py-1.5 text-xs font-semibold transition', d.alerts.includes(o.min) ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted hover:text-text')}
              >
                {o.label}
              </button>
            ))}
          </div>
          {allDay && <p className="mt-1.5 text-[11px] text-muted">{t.f(m.reminders.editor.allDayNote, { time: t.time(REMINDER_ALL_DAY_TIME) })}</p>}
        </div>
        {d.repeat === 'yearly' && (
          <label className="-mt-1 flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={d.countYears} onChange={(e) => set('countYears', e.target.checked)} className="accent-[var(--accent)]" />
            {m.reminders.editor.countYears}
          </label>
        )}
        {contacts.length > 0 && (
          <div>
            <Label hint={m.common.optional}>{m.reminders.editor.aboutSomeone}</Label>
            <Select value={d.contactId ?? ''} onChange={(e) => set('contactId', e.target.value || null)}>
              <option value="">{m.reminders.editor.nobody}</option>
              {contacts.filter((c) => !c.archived || c.id === d.contactId).sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}
        <button type="button" onClick={() => set('important', !d.important)} className={cx('flex w-full items-center gap-3 rounded-xl border p-3 text-start transition', d.important ? 'border-gold/60 bg-amber-500/10' : 'border-border')}>
          <Star size={18} className={d.important ? 'fill-gold text-gold' : 'text-muted'} />
          <span>
            <span className="block text-sm font-semibold">{m.reminders.editor.important}</span>
            <span className="block text-xs text-muted">{m.reminders.editor.importantBody}</span>
          </span>
        </button>
        <div><Label>{m.common.notes}</Label><Textarea placeholder={m.reminders.editor.notesPlaceholder} value={d.notes} onChange={(e) => set('notes', e.target.value)} className="min-h-16" /></div>
      </div>
    </Modal>
  )
}
