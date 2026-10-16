import { format, formatDistanceToNowStrict } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlarmClock, ArrowLeft, Bell, Cake, Check, Heart, Link2, Mail, MessageCircle, Pencil, Phone, Plus, Search, Trash2, UserPlus,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, Segmented, SectionTitle, Select, Textarea } from '../components/ui'
import { celebrate } from '../lib/celebrate'
import {
  CADENCES, cadenceLabel, checkIn, initials, interactionsOf, KIND_LABEL, nextBirthday, parseBirthday, type CheckIn,
} from '../lib/connections'
import { addDaysKey, diffDays, fromKey, prettyDay, todayKey } from '../lib/date'
import { useData, useToday } from '../lib/hooks'
import { nextOccurrence, whenText } from '../lib/reminders'
import { navigate, useRouteParam } from '../lib/router'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { CIRCLES, type Circle, type Contact, type InteractionKind, type Reminder } from '../lib/types'
import { ReminderEditor } from './Reminders'

export const CIRCLE: Record<Circle, { label: string; emoji: string; hex: string }> = {
  family: { label: 'Family', emoji: '🏡', hex: '#f43f5e' },
  friend: { label: 'Friends', emoji: '🫶', hex: '#f59e0b' },
  university: { label: 'University', emoji: '🎓', hex: '#6366f1' },
  work: { label: 'Work', emoji: '💼', hex: '#0ea5e9' },
  mentor: { label: 'Mentors', emoji: '🧭', hex: '#8b5cf6' },
  other: { label: 'Other', emoji: '✨', hex: '#64748b' },
}

export function Avatar({ c, size = 44 }: { c: Contact; size?: number }) {
  const hex = CIRCLE[c.circle].hex
  return (
    <div className="grid shrink-0 place-items-center rounded-full font-bold" style={{ width: size, height: size, background: `${hex}22`, color: hex, fontSize: c.emoji ? size * 0.5 : size * 0.36 }}>
      {c.emoji || initials(c.name) || '?'}
    </div>
  )
}

function dueLine(ci: CheckIn): { text: string; cls: string } {
  if (ci.state === 'none' || ci.days === null) return { text: ci.last ? `Last talked ${prettyDay(ci.last).toLowerCase()}` : 'No rhythm set', cls: 'text-muted' }
  if (ci.state === 'overdue') return { text: `Overdue by ${-ci.days} day${ci.days === -1 ? '' : 's'}`, cls: 'font-semibold text-danger' }
  if (ci.state === 'today') return { text: 'Check in today', cls: 'font-semibold text-accent' }
  return { text: ci.days === 1 ? 'Next check-in tomorrow' : `Next check-in in ${ci.days} days`, cls: ci.state === 'soon' ? 'text-accent' : 'text-muted' }
}

function lastText(last: string | null): string {
  if (!last) return 'never logged'
  const n = diffDays(todayKey(), last)
  if (n <= 0) return 'last talked today'
  if (n === 1) return 'last talked yesterday'
  if (n < 45) return `last talked ${n} days ago`
  return `last talked ${formatDistanceToNowStrict(fromKey(last))} ago`
}

export function ConnectionsPage() {
  const id = useRouteParam()
  return id ? <ContactDetail id={id} /> : <ContactList />
}

function ContactList() {
  const d = useData()
  const today = useToday()
  const [q, setQ] = useState('')
  const [circle, setCircle] = useState<Circle | 'all'>('all')
  const [creating, setCreating] = useState(false)
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
        title="Connections"
        subtitle={live.length ? `${live.length} ${live.length === 1 ? 'person' : 'people'}${reachOut.length ? ` · ${reachOut.length} to reach out to` : ''}` : 'The people who matter — and a gentle nudge to stay in touch.'}
        right={<Button variant="primary" onClick={() => setCreating(true)}><UserPlus size={16} /> Add person</Button>}
      />

      {live.length === 0 ? (
        <EmptyState emoji="🫶" title="Add the people you care about">
          Family, friends, university and work colleagues. Choose how often you want to check in with each — Itqan tells you when it is time.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {(reachOut.length > 0 || birthdays.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              {reachOut.length > 0 && (
                <section>
                  <SectionTitle>Reach out · {reachOut.length}</SectionTitle>
                  <Card className="divide-y divide-border">
                    <AnimatePresence initial={false}>
                      {reachOut.map(({ c, ci }) => {
                        const line = dueLine(ci)
                        return (
                          <motion.div key={c.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-3 p-3">
                            <button onClick={() => navigate('connections', c.id)} className="flex min-w-[13rem] flex-1 items-center gap-3 text-left">
                              <Avatar c={c} size={40} />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{c.name}</span>
                                <span className={cx('text-xs', line.cls)}>{line.text}</span>
                                <span className="text-xs text-muted"> · {lastText(ci.last)}</span>
                              </span>
                            </button>
                            <div className="ml-auto flex gap-1">
                              <Button size="sm" variant="primary" onClick={() => setLogging(c)}><Check size={14} /> Checked in</Button>
                              <IconButton label="Snooze a week" onClick={() => { snooze(c.id, addDaysKey(today, 7)); toast({ emoji: '⏰', message: `${c.name}: in a week` }) }}><AlarmClock size={15} /></IconButton>
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
                  <SectionTitle>Birthdays · next 30 days</SectionTitle>
                  <Card className="divide-y divide-border">
                    {birthdays.map(({ c, b }) => (
                      <button key={c.id} onClick={() => navigate('connections', c.id)} className="flex w-full items-center gap-3 p-3 text-left">
                        <Avatar c={c} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{c.name}</span>
                          <span className="text-xs text-muted">{format(fromKey(b.date), 'EEE, MMM d')}{b.age ? ` · turns ${b.age}` : ''}</span>
                        </span>
                        <span className={cx('text-sm font-bold', b.days === 0 ? 'text-accent' : 'text-muted')}>{b.days === 0 ? '🎂 Today' : `${b.days}d`}</span>
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
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input placeholder="Search people, companies, tags" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Segmented
              className="mb-4"
              value={circle}
              onChange={setCircle}
              options={[{ value: 'all' as const, label: `All · ${live.length}` }, ...CIRCLES.filter((k) => counts[k]).map((k) => ({ value: k, label: `${CIRCLE[k].emoji} ${CIRCLE[k].label} · ${counts[k]}` }))]}
            />
            {list.length === 0 ? <EmptyState emoji="🔍" title="Nobody matches" /> : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map(({ c, ci }) => {
                  const line = dueLine(ci)
                  return (
                    <button key={c.id} onClick={() => navigate('connections', c.id)} className="text-left">
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

  if (!c) {
    return (
      <div>
        <button onClick={() => navigate('connections')} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Connections</button>
        <EmptyState emoji="🔍" title="Person not found">They may have been removed on another device.</EmptyState>
      </div>
    )
  }

  const ci = checkIn(c, d.interactions, today)
  const line = dueLine(ci)
  const history = interactionsOf(c.id, d.interactions)
  const bday = c.birthday ? nextBirthday(c.birthday, today) : null
  const about = d.reminders.filter((r) => r.contactId === c.id && !(r.repeat === 'none' && r.done))
  const digits = c.phone.replace(/[^\d+]/g, '')

  const actions = [
    digits && { href: `tel:${digits}`, icon: <Phone size={16} />, label: 'Call' },
    digits && { href: `sms:${digits}`, icon: <MessageCircle size={16} />, label: 'Message' },
    digits && { href: `https://wa.me/${digits.replace(/^\+/, '')}`, icon: <span className="text-sm">🟢</span>, label: 'WhatsApp' },
    c.email && { href: `mailto:${c.email}`, icon: <Mail size={16} />, label: 'Email' },
    c.link && { href: /^[a-z]+:\/\//i.test(c.link) ? c.link : `https://${c.link}`, icon: <Link2 size={16} />, label: 'Profile' },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('connections')} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={16} /> Connections</button>
        <div className="flex gap-1">
          <IconButton label={c.favorite ? 'Remove from favourites' : 'Favourite'} onClick={() => update(c.id, { favorite: !c.favorite })} className={c.favorite ? 'text-rose-500' : ''}>
            <Heart size={17} fill={c.favorite ? 'currentColor' : 'none'} />
          </IconButton>
          <IconButton label="Edit" onClick={() => setEditing(true)}><Pencil size={16} /></IconButton>
          <IconButton label="Delete" className="hover:text-danger" onClick={() => {
            if (confirm(`Remove ${c.name}? Their check-in history and birthday reminder are deleted too.`)) { remove(c.id); navigate('connections') }
          }}><Trash2 size={16} /></IconButton>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block"><Avatar c={c} size={72} /></div>
        <div className="sm:hidden"><Avatar c={c} size={56} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-md px-1.5 py-0.5" style={{ background: `${CIRCLE[c.circle].hex}1f`, color: CIRCLE[c.circle].hex }}>{CIRCLE[c.circle].emoji} {CIRCLE[c.circle].label}</span>
            {c.tags.map((t) => <span key={t} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-muted">#{t}</span>)}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{c.name}</h1>
          {(c.role || c.company) && <p className="text-sm text-muted">{[c.role, c.company].filter(Boolean).join(' · ')}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setLogging(true)}><Check size={16} /> Log a check-in</Button>
        <Button onClick={() => setReminding('new')}><Bell size={16} /> Remind me…</Button>
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
            <SectionTitle className="mb-0">Staying in touch</SectionTitle>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={cx('text-lg font-bold', line.cls)}>{line.text}</div>
                <div className="text-xs text-muted">{cadenceLabel(c.cadenceDays)} · {lastText(ci.last)}</div>
              </div>
              {ci.state !== 'none' && (
                <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" onClick={() => { snooze(c.id, addDaysKey(today, 7)); toast({ emoji: '⏰', message: 'Snoozed for a week' }) }}>
                  <AlarmClock size={14} /> Snooze 1 week
                </Button>
              )}
            </div>
            <Select value={c.cadenceDays ?? ''} onChange={(e) => update(c.id, { cadenceDays: e.target.value ? Number(e.target.value) : null })} aria-label="Check-in rhythm">
              <option value="">No rhythm</option>
              {CADENCES.map((x) => <option key={x.days} value={x.days}>{x.label}</option>)}
            </Select>
          </Card>

          {bday && (
            <Card className="flex items-center gap-4 p-5">
              <div className="grid size-12 place-items-center rounded-2xl bg-rose-500/10 text-2xl">🎂</div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{bday.days === 0 ? 'Birthday today!' : `Birthday in ${bday.days} day${bday.days === 1 ? '' : 's'}`}</div>
                <div className="text-xs text-muted">{format(fromKey(bday.date), 'EEEE, MMMM d')}{bday.age ? ` · turns ${bday.age}` : ''}</div>
              </div>
              <BirthdayToggle c={c} />
            </Card>
          )}

          {(c.phone || c.email || c.howWeMet || c.notes) && (
            <Card className="space-y-3 p-5 text-sm">
              <SectionTitle className="mb-0">About</SectionTitle>
              {c.phone && <Row k="Phone" v={c.phone} />}
              {c.email && <Row k="Email" v={c.email} />}
              {c.howWeMet && <Row k="How we met" v={c.howWeMet} />}
              {c.notes && <p className="whitespace-pre-line rounded-xl bg-surface-2/50 p-3 leading-relaxed">{c.notes}</p>}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {about.length > 0 && (
            <section>
              <SectionTitle>Reminders about {c.name.split(' ')[0]}</SectionTitle>
              <Card className="divide-y divide-border">
                {about.map((r) => (
                  <button key={r.id} onClick={() => setReminding(r)} className="flex w-full items-center gap-3 p-3 text-left">
                    <span className="text-xl">{r.emoji || '🔔'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.title}</span>
                      <span className="text-xs text-muted">{whenText(r, nextOccurrence(r, new Date()), new Date())}</span>
                    </span>
                  </button>
                ))}
              </Card>
            </section>
          )}

          <section>
            <SectionTitle right={<button onClick={() => setLogging(true)} className="text-xs font-semibold text-accent"><Plus size={12} className="inline" /> Log</button>}>
              History · {history.length}
            </SectionTitle>
            {history.length === 0 ? (
              <EmptyState emoji="📝" title="No check-ins yet">Log calls, messages and meetups here — with a note of what you talked about.</EmptyState>
            ) : (
              <Card className="p-2">
                <ol className="relative">
                  {history.map((i) => (
                    <li key={i.id} className="group flex gap-3 rounded-xl p-3 hover:bg-surface-2/50">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-base">{KIND_LABEL[i.kind].emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{KIND_LABEL[i.kind].label} <span className="font-normal text-muted">· {format(fromKey(i.date), 'EEE, MMM d, yyyy')}</span></div>
                        {i.note && <p className="mt-0.5 whitespace-pre-line text-sm text-muted">{i.note}</p>}
                      </div>
                      <IconButton label="Delete check-in" className="hover:text-danger sm:opacity-0 sm:group-hover:opacity-100" onClick={() => deleteInteraction(i.id)}><Trash2 size={14} /></IconButton>
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
        template={{ contactId: c.id, emoji: '👤', title: `Talk to ${c.name.split(' ')[0]}: `, repeat: 'none', time: '10:00', alerts: [0], date: addDaysKey(today, 1) }}
        onClose={() => setReminding(null)}
      />
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-3"><span className="w-24 shrink-0 text-muted">{k}</span><span className="min-w-0 break-words">{v}</span></div>
}

function BirthdayToggle({ c }: { c: Contact }) {
  const sync = useStore((s) => s.syncBirthdayReminder)
  const on = !!c.birthdayReminderId
  return (
    <Button size="sm" variant={on ? 'soft' : 'primary'} onClick={() => { sync(c.id, !on); toast({ emoji: on ? '🔕' : '🎂', message: on ? 'Birthday reminder removed' : 'You’ll be reminded on the day and a week before' }) }}>
      {on ? <><Bell size={13} /> Reminding</> : <><Cake size={13} /> Remind me</>}
    </Button>
  )
}

export function LogCheckIn({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
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
    toast({ emoji: '🫶', message: `Checked in with ${contact.name} · +5 XP` })
    onClose()
  }

  return (
    <Modal open={!!contact} onClose={onClose} title={contact ? `Check-in with ${contact.name}` : ''}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save check-in</Button></>}>
      <div className="space-y-4">
        <div>
          <Label>How?</Label>
          <Segmented value={kind} onChange={setKind} options={(Object.keys(KIND_LABEL) as InteractionKind[]).map((k) => ({ value: k, label: `${KIND_LABEL[k].emoji} ${KIND_LABEL[k].label}` }))} />
        </div>
        <div><Label>When</Label><Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} className="w-auto" /></div>
        <div><Label hint="optional">What did you talk about?</Label><Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="News, plans, anything to follow up on…" /></div>
      </div>
    </Modal>
  )
}

type Draft = Pick<Contact, 'name' | 'emoji' | 'circle' | 'tags' | 'phone' | 'email' | 'link' | 'company' | 'role' | 'howWeMet' | 'birthday' | 'notes' | 'cadenceDays' | 'lastContactManual'>

export function ContactEditor({ open, onClose, contact, onCreated }: { open: boolean; onClose: () => void; contact?: Contact; onCreated?: (id: string) => void }) {
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
      tags: [...new Set(tags.split(',').map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))],
    }
    let id = contact?.id
    if (contact) update(contact.id, clean)
    else { id = add(clean); toast({ emoji: '🫶', message: `${clean.name} added` }) }
    syncBirthday(id!, !!birthday && remindBday)
    if (!contact) onCreated?.(id!)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={contact ? 'Edit person' : 'Add a person'} wide
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={!d.name.trim()}>{contact ? 'Save' : 'Add person'}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div><Label>Name</Label><Input autoFocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" /></div>
          <div><Label hint="optional">Emoji</Label><Input value={d.emoji} maxLength={4} onChange={(e) => set('emoji', e.target.value)} placeholder="🙂" className="w-20 text-center" /></div>
        </div>
        <div>
          <Label>Circle</Label>
          <Segmented value={d.circle} onChange={(v) => set('circle', v)} options={CIRCLES.map((k) => ({ value: k, label: `${CIRCLE[k].emoji} ${CIRCLE[k].label}` }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Check in</Label>
            <Select value={d.cadenceDays ?? ''} onChange={(e) => set('cadenceDays', e.target.value ? Number(e.target.value) : null)}>
              <option value="">No rhythm</option>
              {CADENCES.map((x) => <option key={x.days} value={x.days}>{x.label}</option>)}
            </Select>
          </div>
          <div><Label hint="optional">Last time we talked</Label><Input type="date" max={today} value={d.lastContactManual ?? ''} onChange={(e) => set('lastContactManual', e.target.value || null)} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label hint="with country code, e.g. +20…">Phone</Label><Input type="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+20 1xx xxx xxxx" /></div>
          <div><Label>Email</Label><Input type="email" value={d.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><Label>Role</Label><Input value={d.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Classmate, Team lead" /></div>
          <div><Label>Company / university</Label><Input value={d.company} onChange={(e) => set('company', e.target.value)} /></div>
        </div>
        <div><Label hint="LinkedIn, Instagram…">Profile link</Label><Input value={d.link} onChange={(e) => set('link', e.target.value)} placeholder="linkedin.com/in/…" /></div>
        <div>
          <Label>Birthday</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input type="date" value={bdayDate} onChange={(e) => setBdayDate(e.target.value)} className="w-auto" />
            <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={noYear} onChange={(e) => setNoYear(e.target.checked)} className="accent-[var(--accent)]" /> Year unknown</label>
            {bdayDate && <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={remindBday} onChange={(e) => setRemindBday(e.target.checked)} className="accent-[var(--accent)]" /> Remind me</label>}
          </div>
        </div>
        <div><Label>How we met</Label><Input value={d.howWeMet} onChange={(e) => set('howWeMet', e.target.value)} placeholder="e.g. Engineering faculty, 2017" /></div>
        <div><Label hint="comma separated">Tags</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="gym, french, mentor" /></div>
        <div><Label>Notes</Label><Textarea value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Kids’ names, favourite things, gift ideas…" /></div>
      </div>
    </Modal>
  )
}
