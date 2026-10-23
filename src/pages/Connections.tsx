import { AnimatePresence, motion } from 'motion/react'
import {
  AlarmClock, ArrowLeft, Bell, Cake, Check, Heart, Link2, Mail, MessageCircle, Pencil, Phone, Plus, Search, Trash2, UserPlus, Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { usePageAction } from '../components/Shell'
import { Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, Segmented, SectionTitle, Select, Textarea } from '../components/ui'
import type { I18n } from '../i18n/core'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import {
  CADENCES, cadenceLabel, checkIn, initials, interactionsOf, KIND_EMOJI, nextBirthday, parseBirthday, type CheckIn,
} from '../lib/connections'
import { addDaysKey, diffDays, prettyDay, todayKey } from '../lib/date'
import { XP } from '../lib/gamification'
import { useData, useToday } from '../lib/hooks'
import { nextOccurrence, whenText } from '../lib/reminders'
import { navigate, useRouteParam } from '../lib/router'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { CIRCLES, type Circle, type Contact, type InteractionKind, type Reminder } from '../lib/types'
import { ReminderEditor } from './Reminders'

/** A circle's emoji and colour; its name is `m.connections.circles[circle]`. */
export const CIRCLE: Record<Circle, { emoji: string; hex: string }> = {
  family: { emoji: '🏡', hex: '#f43f5e' },
  friend: { emoji: '🫶', hex: '#f59e0b' },
  university: { emoji: '🎓', hex: '#6366f1' },
  work: { emoji: '💼', hex: '#0ea5e9' },
  mentor: { emoji: '🧭', hex: '#8b5cf6' },
  other: { emoji: '✨', hex: '#64748b' },
}

export function Avatar({ c, size = 44 }: { c: Contact; size?: number }) {
  const hex = CIRCLE[c.circle].hex
  return (
    <div className="grid shrink-0 place-items-center rounded-full font-bold" style={{ width: size, height: size, background: `${hex}22`, color: hex, fontSize: c.emoji ? size * 0.5 : size * 0.36 }}>
      {c.emoji || initials(c.name) || '?'}
    </div>
  )
}

function dueLine(ci: CheckIn, t: I18n): { text: string; cls: string } {
  const due = t.m.connections.due
  if (ci.state === 'none' || ci.days === null) return { text: ci.last ? t.f(due.lastTalked, { when: prettyDay(ci.last, todayKey(), t).toLocaleLowerCase(t.locale) }) : due.noRhythm, cls: 'text-muted' }
  if (ci.state === 'overdue') return { text: t.p(due.overdueBy, -ci.days), cls: 'font-semibold text-danger' }
  if (ci.state === 'today') return { text: due.today, cls: 'font-semibold text-accent' }
  return { text: ci.days === 1 ? due.tomorrow : t.p(due.inDays, ci.days), cls: ci.state === 'soon' ? 'text-accent' : 'text-muted' }
}

function lastText(last: string | null, t: I18n): string {
  const l = t.m.connections.last
  if (!last) return l.never
  const n = diffDays(todayKey(), last)
  if (n <= 0) return l.today
  if (n === 1) return l.yesterday
  if (n < 45) return t.p(l.daysAgo, n)
  if (n < 365) return t.p(l.monthsAgo, Math.round(n / 30.4))
  return t.p(l.yearsAgo, Math.round(n / 365))
}

export function ConnectionsPage() {
  const id = useRouteParam()
  return id ? <ContactDetail id={id} /> : <ContactList />
}

function ContactList() {
  const t = useI18n()
  const { m } = t
  const d = useData()
  const today = useToday()
  const [q, setQ] = useState('')
  const [circle, setCircle] = useState<Circle | 'all'>('all')
  const [creating, setCreating] = useState(false)
  usePageAction({ label: m.connections.list.addPerson, icon: <Users size={24} />, run: () => setCreating(true) })
  const [logging, setLogging] = useState<Contact | null>(null)
  const snooze = useStore((s) => s.snoozeContact)

  const live = d.contacts.filter((c) => !c.archived)
  const withCi = useMemo(() => live.map((c) => ({ c, ci: checkIn(c, d.interactions, today) })), [live, d.interactions, today])
  const reachOut = withCi.filter((x) => x.ci.days !== null && x.ci.days <= 2).sort((a, b) => (a.ci.days ?? 0) - (b.ci.days ?? 0))
  const birthdays = live
    .map((c) => ({ c, b: c.birthday ? nextBirthday(c.birthday, today) : null }))
    .filter((x): x is { c: Contact; b: NonNullable<ReturnType<typeof nextBirthday>> } => !!x.b && x.b.days <= 30)
    .sort((a, b) => a.b.days - b.b.days)

  const list = withCi
    .filter((x) => circle === 'all' || x.c.circle === circle)
    .filter((x) => !q || `${x.c.name} ${x.c.company} ${x.c.role} ${x.c.tags.join(' ')} ${x.c.notes}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.c.favorite) - Number(a.c.favorite) || a.c.name.localeCompare(b.c.name))
  const counts = Object.fromEntries(CIRCLES.map((k) => [k, live.filter((c) => c.circle === k).length])) as Record<Circle, number>

  return (
    <div>
      <PageHeader
        title={m.connections.list.title}
        subtitle={live.length ? [t.p(m.connections.list.people, live.length), reachOut.length ? t.p(m.connections.list.toReachOut, reachOut.length) : ''].filter(Boolean).join(' · ') : m.connections.list.subtitleEmpty}
        right={<Button variant="primary" onClick={() => setCreating(true)}><UserPlus size={16} /> {m.connections.list.addPerson}</Button>}
      />

      {live.length === 0 ? (
        <EmptyState emoji="🫶" title={m.connections.list.emptyTitle}>
          {m.connections.list.emptyBody}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {(reachOut.length > 0 || birthdays.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              {reachOut.length > 0 && (
                <section>
                  <SectionTitle>{t.f(m.connections.list.reachOut, { n: reachOut.length })}</SectionTitle>
                  <Card className="divide-y divide-border">
                    <AnimatePresence initial={false}>
                      {reachOut.map(({ c, ci }) => {
                        const line = dueLine(ci, t)
                        return (
                          <motion.div key={c.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-3 p-3">
                            <button onClick={() => navigate('connections', c.id)} className="flex min-w-[13rem] flex-1 items-center gap-3 text-start">
                              <Avatar c={c} size={40} />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{c.name}</span>
                                <span className={cx('text-xs', line.cls)}>{line.text}</span>
                                <span className="text-xs text-muted"> · {lastText(ci.last, t)}</span>
                              </span>
                            </button>
                            <div className="ms-auto flex gap-1">
                              <Button size="sm" variant="primary" onClick={() => setLogging(c)}><Check size={14} /> {m.connections.list.checkedIn}</Button>
                              <IconButton label={m.connections.list.snoozeWeek} onClick={() => { snooze(c.id, addDaysKey(today, 7)); toast({ emoji: '⏰', message: t.f(m.connections.list.snoozedToast, { name: c.name }) }) }}><AlarmClock size={15} /></IconButton>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </Card>
                </section>
              )}
              {birthdays.length > 0 && (
                <section>
                  <SectionTitle>{m.connections.list.birthdays}</SectionTitle>
                  <Card className="divide-y divide-border">
                    {birthdays.map(({ c, b }) => (
                      <button key={c.id} onClick={() => navigate('connections', c.id)} className="flex w-full items-center gap-3 p-3 text-start">
                        <Avatar c={c} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{c.name}</span>
                          <span className="text-xs text-muted">{b.age ? t.f(m.connections.list.dateTurns, { date: t.d(b.date, 'weekdayShort'), age: b.age }) : t.d(b.date, 'weekdayShort')}</span>
                        </span>
                        <span className={cx('text-sm font-bold', b.days === 0 ? 'text-accent' : 'text-muted')}>{b.days === 0 ? `🎂 ${m.time.today}` : t.p(m.connections.list.daysShort, b.days)}</span>
                      </button>
                    ))}
                  </Card>
                </section>
              )}
            </div>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-52 flex-1">
                <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input placeholder={m.connections.list.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" />
              </div>
            </div>
            <Segmented
              className="mb-4"
              value={circle}
              onChange={setCircle}
              options={[{ value: 'all' as const, label: t.f(m.connections.list.allCount, { n: live.length }) }, ...CIRCLES.filter((k) => counts[k]).map((k) => ({ value: k, label: `${CIRCLE[k].emoji} ${t.f(m.connections.list.circleCount, { circle: m.connections.circles[k], n: counts[k] })}` }))]}
            />
            {list.length === 0 ? <EmptyState emoji="🔍" title={m.connections.list.nobody} /> : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map(({ c, ci }) => {
                  const line = dueLine(ci, t)
                  return (
                    <button key={c.id} onClick={() => navigate('connections', c.id)} className="text-start">
                      <Card className="flex h-full items-center gap-3 p-4 transition hover:border-text/20">
                        <Avatar c={c} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-bold">{c.name}</span>
                            {c.favorite && <Heart size={13} className="shrink-0 fill-rose-500 text-rose-500" />}
                          </div>
                          {(c.role || c.company) && <div className="truncate text-xs text-muted">{[c.role, c.company].filter(Boolean).join(' · ')}</div>}
                          <div className={cx('mt-0.5 text-xs', line.cls)}>{line.text}</div>
                        </div>
                      </Card>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <ContactEditor open={creating} onClose={() => setCreating(false)} onCreated={(id) => navigate('connections', id)} />
      <LogCheckIn contact={logging} onClose={() => setLogging(null)} />
    </div>
  )
}

function ContactDetail({ id }: { id: string }) {
  const t = useI18n()
  const { m } = t
  const d = useData()
  const today = useToday()
  const update = useStore((s) => s.updateContact)
  const remove = useStore((s) => s.deleteContact)
  const snooze = useStore((s) => s.snoozeContact)
  const deleteInteraction = useStore((s) => s.deleteInteraction)
  const [editing, setEditing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [reminding, setReminding] = useState<Reminder | 'new' | null>(null)
  const c = d.contacts.find((x) => x.id === id)
  usePageAction(c ? { label: m.connections.detail.log, icon: <MessageCircle size={24} />, run: () => setLogging(true) } : null)

  if (!c) {
    return (
      <div>
        <button onClick={() => navigate('connections')} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} className="rtl:-scale-x-100" /> {m.nav.connections}</button>
        <EmptyState emoji="🔍" title={m.connections.detail.notFound}>{m.connections.detail.notFoundBody}</EmptyState>
      </div>
    )
  }

  const ci = checkIn(c, d.interactions, today)
  const line = dueLine(ci, t)
  const history = interactionsOf(c.id, d.interactions)
  const bday = c.birthday ? nextBirthday(c.birthday, today) : null
  const about = d.reminders.filter((r) => r.contactId === c.id && !(r.repeat === 'none' && r.done))
  const digits = c.phone.replace(/[^\d+]/g, '')

  const actions = [
    digits && { href: `tel:${digits}`, icon: <Phone size={16} />, label: m.connections.detail.actions.call },
    digits && { href: `sms:${digits}`, icon: <MessageCircle size={16} />, label: m.connections.detail.actions.message },
    digits && { href: `https://wa.me/${digits.replace(/^\+/, '')}`, icon: <span className="text-sm">🟢</span>, label: m.connections.detail.actions.whatsapp },
    c.email && { href: `mailto:${c.email}`, icon: <Mail size={16} />, label: m.connections.detail.actions.email },
    c.link && { href: /^[a-z]+:\/\//i.test(c.link) ? c.link : `https://${c.link}`, icon: <Link2 size={16} />, label: m.connections.detail.actions.profile },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('connections')} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} className="rtl:-scale-x-100" /> {m.nav.connections}</button>
        <div className="flex gap-1">
          <IconButton label={c.favorite ? m.connections.detail.removeFavourite : m.common.favourite} onClick={() => update(c.id, { favorite: !c.favorite })} className={c.favorite ? 'text-rose-500' : ''}>
            <Heart size={17} fill={c.favorite ? 'currentColor' : 'none'} />
          </IconButton>
          <IconButton label={m.common.edit} onClick={() => setEditing(true)}><Pencil size={16} /></IconButton>
          <IconButton label={m.common.delete} className="hover:text-danger" onClick={() => {
            if (confirm(t.f(m.connections.detail.removeConfirm, { name: c.name }))) { remove(c.id); navigate('connections') }
          }}><Trash2 size={16} /></IconButton>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block"><Avatar c={c} size={72} /></div>
        <div className="sm:hidden"><Avatar c={c} size={56} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-md px-1.5 py-0.5" style={{ background: `${CIRCLE[c.circle].hex}1f`, color: CIRCLE[c.circle].hex }}>{CIRCLE[c.circle].emoji} {m.connections.circles[c.circle]}</span>
            {c.tags.map((tag) => <span key={tag} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-muted">#{tag}</span>)}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{c.name}</h1>
          {(c.role || c.company) && <p className="text-sm text-muted">{[c.role, c.company].filter(Boolean).join(' · ')}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setLogging(true)}><Check size={16} /> {m.connections.detail.logCheckIn}</Button>
        <Button onClick={() => setReminding('new')}><Bell size={16} /> {m.connections.detail.remindMe}</Button>
        {actions.map((a) => (
          <a key={a.label} href={a.href} target={a.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition hover:bg-surface-2">
            {a.icon} {a.label}
          </a>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <SectionTitle className="mb-0">{m.connections.detail.stayingInTouch}</SectionTitle>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={cx('text-lg font-bold', line.cls)}>{line.text}</div>
                <div className="text-xs text-muted">{cadenceLabel(c.cadenceDays, t)} · {lastText(ci.last, t)}</div>
              </div>
              {ci.state !== 'none' && (
                <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" onClick={() => { snooze(c.id, addDaysKey(today, 7)); toast({ emoji: '⏰', message: m.connections.detail.snoozedToast }) }}>
                  <AlarmClock size={14} /> {m.connections.detail.snoozeOneWeek}
                </Button>
              )}
            </div>
            <Select value={c.cadenceDays ?? ''} onChange={(e) => update(c.id, { cadenceDays: e.target.value ? Number(e.target.value) : null })} aria-label={m.connections.detail.rhythmLabel}>
              <option value="">{m.connections.cadence.none}</option>
              {CADENCES.map((days) => <option key={days} value={days}>{cadenceLabel(days, t)}</option>)}
            </Select>
          </Card>

          {bday && (
            <Card className="flex items-center gap-4 p-5">
              <div className="grid size-12 place-items-center rounded-2xl bg-rose-500/10 text-2xl">🎂</div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{bday.days === 0 ? m.connections.detail.birthdayToday : t.p(m.connections.detail.birthdayIn, bday.days)}</div>
                <div className="text-xs text-muted">{bday.age ? t.f(m.connections.list.dateTurns, { date: t.d(bday.date, 'full'), age: bday.age }) : t.d(bday.date, 'full')}</div>
              </div>
              <BirthdayToggle c={c} />
            </Card>
          )}

          {(c.phone || c.email || c.howWeMet || c.notes) && (
            <Card className="space-y-3 p-5 text-sm">
              <SectionTitle className="mb-0">{m.connections.detail.about}</SectionTitle>
              {c.phone && <Row k={m.connections.detail.phone} v={c.phone} ltr />}
              {c.email && <Row k={m.connections.detail.email} v={c.email} ltr />}
              {c.howWeMet && <Row k={m.connections.detail.howWeMet} v={c.howWeMet} />}
              {c.notes && <p className="whitespace-pre-line rounded-xl bg-surface-2/50 p-3 leading-relaxed">{c.notes}</p>}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {about.length > 0 && (
            <section>
              <SectionTitle>{t.f(m.connections.detail.remindersAbout, { name: c.name.split(' ')[0] })}</SectionTitle>
              <Card className="divide-y divide-border">
                {about.map((r) => (
                  <button key={r.id} onClick={() => setReminding(r)} className="flex w-full items-center gap-3 p-3 text-start">
                    <span className="text-xl">{r.emoji || '🔔'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.title}</span>
                      <span className="text-xs text-muted">{whenText(r, nextOccurrence(r, new Date()), new Date(), t)}</span>
                    </span>
                  </button>
                ))}
              </Card>
            </section>
          )}

          <section>
            <SectionTitle right={<button onClick={() => setLogging(true)} className="text-xs font-semibold text-accent"><Plus size={12} className="inline" /> {m.connections.detail.log}</button>}>
              {t.f(m.connections.detail.history, { n: history.length })}
            </SectionTitle>
            {history.length === 0 ? (
              <EmptyState emoji="📝" title={m.connections.detail.noCheckIns}>{m.connections.detail.noCheckInsBody}</EmptyState>
            ) : (
              <Card className="p-2">
                <ol className="relative">
                  {history.map((i) => (
                    <li key={i.id} className="group flex gap-3 rounded-xl p-3 hover:bg-surface-2/50">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-base">{KIND_EMOJI[i.kind]}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{m.connections.kinds[i.kind]} <span className="font-normal text-muted">· {t.d(i.date, 'medium')}</span></div>
                        {i.note && <p className="mt-0.5 whitespace-pre-line text-sm text-muted">{i.note}</p>}
                      </div>
                      <IconButton label={m.connections.detail.deleteCheckIn} className="hover:text-danger sm:opacity-0 sm:group-hover:opacity-100" onClick={() => deleteInteraction(i.id)}><Trash2 size={14} /></IconButton>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </section>
        </div>
      </div>

      <ContactEditor open={editing} onClose={() => setEditing(false)} contact={c} />
      <LogCheckIn contact={logging ? c : null} onClose={() => setLogging(false)} />
      <ReminderEditor
        reminder={reminding}
        template={{ contactId: c.id, emoji: '👤', title: t.f(m.connections.detail.talkTo, { name: c.name.split(' ')[0] }), repeat: 'none', time: '10:00', alerts: [0], date: addDaysKey(today, 1) }}
        onClose={() => setReminding(null)}
      />
    </div>
  )
}

function Row({ k, v, ltr }: { k: string; v: string; ltr?: boolean }) {
  return <div className="flex gap-3"><span className="w-24 shrink-0 text-muted">{k}</span><span className="min-w-0 break-words" dir={ltr ? 'ltr' : undefined}>{v}</span></div>
}

function BirthdayToggle({ c }: { c: Contact }) {
  const { m } = useI18n()
  const sync = useStore((s) => s.syncBirthdayReminder)
  const on = !!c.birthdayReminderId
  return (
    <Button size="sm" variant={on ? 'soft' : 'primary'} onClick={() => { sync(c.id, !on); toast({ emoji: on ? '🔕' : '🎂', message: on ? m.connections.birthday.removed : m.connections.birthday.added }) }}>
      {on ? <><Bell size={13} /> {m.connections.birthday.reminding}</> : <><Cake size={13} /> {m.connections.birthday.remindMe}</>}
    </Button>
  )
}

export function LogCheckIn({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const t = useI18n()
  const { m } = t
  const today = useToday()
  const log = useStore((s) => s.logInteraction)
  const [kind, setKind] = useState<InteractionKind>('call')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  useEffect(() => { if (contact) { setKind('call'); setNote(''); setDate(today) } }, [contact, today])

  const save = () => {
    if (!contact) return
    log(contact.id, kind, note.trim(), date)
    celebrate.tick()
    toast({ emoji: '🫶', message: t.f(m.connections.log.toast, { name: contact.name, xp: XP.checkIn }) })
    onClose()
  }

  return (
    <Modal open={!!contact} onClose={onClose} title={contact ? t.f(m.connections.log.title, { name: contact.name }) : ''}
      footer={<><Button variant="ghost" onClick={onClose}>{m.common.cancel}</Button><Button variant="primary" onClick={save}>{m.connections.log.save}</Button></>}>
      <div className="space-y-4">
        <div>
          <Label>{m.connections.log.how}</Label>
          <Segmented value={kind} onChange={setKind} options={(Object.keys(KIND_EMOJI) as InteractionKind[]).map((k) => ({ value: k, label: `${KIND_EMOJI[k]} ${m.connections.kinds[k]}` }))} />
        </div>
        <div><Label>{m.connections.log.when}</Label><Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} className="w-auto" /></div>
        <div><Label hint={m.common.optional}>{m.connections.log.whatTalked}</Label><Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={m.connections.log.notePlaceholder} /></div>
      </div>
    </Modal>
  )
}

type Draft = Pick<Contact, 'name' | 'emoji' | 'circle' | 'tags' | 'phone' | 'email' | 'link' | 'company' | 'role' | 'howWeMet' | 'birthday' | 'notes' | 'cadenceDays' | 'lastContactManual'>

export function ContactEditor({ open, onClose, contact, onCreated }: { open: boolean; onClose: () => void; contact?: Contact; onCreated?: (id: string) => void }) {
  const t = useI18n()
  const { m } = t
  const today = useToday()
  const add = useStore((s) => s.addContact)
  const update = useStore((s) => s.updateContact)
  const syncBirthday = useStore((s) => s.syncBirthdayReminder)
  const blank: Draft = { name: '', emoji: '', circle: 'friend', tags: [], phone: '', email: '', link: '', company: '', role: '', howWeMet: '', birthday: '', notes: '', cadenceDays: 30, lastContactManual: null }
  const [d, setD] = useState<Draft>(blank)
  const [tags, setTags] = useState('')
  const [bdayDate, setBdayDate] = useState('')
  const [noYear, setNoYear] = useState(false)
  const [remindBday, setRemindBday] = useState(true)

  useEffect(() => {
    if (!open) return
    const x = contact ? { ...contact } : blank
    setD(x)
    setTags(x.tags.join(', '))
    const p = parseBirthday(x.birthday)
    setNoYear(!!p && !p.year)
    setBdayDate(p ? `${p.year ?? 2000}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` : '')
    setRemindBday(contact ? !!contact.birthdayReminderId : true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = () => {
    if (!d.name.trim()) return
    const birthday = bdayDate ? (noYear ? bdayDate.slice(5) : bdayDate) : ''
    const clean: Draft = {
      ...d, name: d.name.trim(), birthday,
      tags: [...new Set(tags.split(/[,،，、]/).map((x) => x.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))],
    }
    let id = contact?.id
    if (contact) update(contact.id, clean)
    else { id = add(clean); toast({ emoji: '🫶', message: t.f(m.connections.editor.added, { name: clean.name }) }) }
    syncBirthday(id!, !!birthday && remindBday)
    if (!contact) onCreated?.(id!)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={contact ? m.connections.editor.editTitle : m.connections.editor.addTitle} wide
      footer={<><Button variant="ghost" onClick={onClose}>{m.common.cancel}</Button><Button variant="primary" onClick={save} disabled={!d.name.trim()}>{contact ? m.common.save : m.connections.editor.addButton}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div><Label>{m.connections.editor.name}</Label><Input autoFocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder={m.connections.editor.namePlaceholder} /></div>
          <div><Label hint={m.common.optional}>{m.common.emoji}</Label><Input value={d.emoji} maxLength={4} onChange={(e) => set('emoji', e.target.value)} placeholder="🙂" className="w-20 text-center" /></div>
        </div>
        <div>
          <Label>{m.connections.editor.circle}</Label>
          <Segmented value={d.circle} onChange={(v) => set('circle', v)} options={CIRCLES.map((k) => ({ value: k, label: `${CIRCLE[k].emoji} ${m.connections.circles[k]}` }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>{m.connections.editor.checkIn}</Label>
            <Select value={d.cadenceDays ?? ''} onChange={(e) => set('cadenceDays', e.target.value ? Number(e.target.value) : null)}>
              <option value="">{m.connections.cadence.none}</option>
              {CADENCES.map((days) => <option key={days} value={days}>{cadenceLabel(days, t)}</option>)}
            </Select>
          </div>
          <div><Label hint={m.common.optional}>{m.connections.editor.lastTalk}</Label><Input type="date" max={today} value={d.lastContactManual ?? ''} onChange={(e) => set('lastContactManual', e.target.value || null)} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label hint={m.connections.editor.phoneHint}>{m.connections.detail.phone}</Label><Input type="tel" dir="ltr" value={d.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+20 1xx xxx xxxx" /></div>
          <div><Label>{m.connections.detail.email}</Label><Input type="email" dir="ltr" value={d.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><Label>{m.connections.editor.role}</Label><Input value={d.role} onChange={(e) => set('role', e.target.value)} placeholder={m.connections.editor.rolePlaceholder} /></div>
          <div><Label>{m.connections.editor.company}</Label><Input value={d.company} onChange={(e) => set('company', e.target.value)} /></div>
        </div>
        <div><Label hint={m.connections.editor.profileHint}>{m.connections.editor.profileLink}</Label><Input dir="ltr" value={d.link} onChange={(e) => set('link', e.target.value)} placeholder="linkedin.com/in/…" /></div>
        <div>
          <Label>{m.connections.editor.birthday}</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input type="date" value={bdayDate} onChange={(e) => setBdayDate(e.target.value)} className="w-auto" />
            <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={noYear} onChange={(e) => setNoYear(e.target.checked)} className="accent-[var(--accent)]" /> {m.connections.editor.yearUnknown}</label>
            {bdayDate && <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={remindBday} onChange={(e) => setRemindBday(e.target.checked)} className="accent-[var(--accent)]" /> {m.connections.editor.remindMe}</label>}
          </div>
        </div>
        <div><Label>{m.connections.detail.howWeMet}</Label><Input value={d.howWeMet} onChange={(e) => set('howWeMet', e.target.value)} placeholder={m.connections.editor.howWeMetPlaceholder} /></div>
        <div><Label hint={m.connections.editor.tagsHint}>{m.common.tags}</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={m.connections.editor.tagsPlaceholder} /></div>
        <div><Label>{m.common.notes}</Label><Textarea value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder={m.connections.editor.notesPlaceholder} /></div>
      </div>
    </Modal>
  )
}
