import { AlertTriangle, Clock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useI18n, rich } from '../i18n/react'
import type { I18n } from '../i18n/core'
import { calendarKey } from '../lib/date'
import { prayerTimes } from '../lib/fajr'
import { isCounted, roundFromEditor, roundProgress } from '../lib/habits'
import { countWeekdays, MAX_NIGHTS, nextWindow, openingWeekdays, windowCheck, type WindowContext } from '../lib/habitWindows'
import { useTick, useToday, useWindowContext } from '../lib/hooks'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { PRAYERS, type Habit, type HabitSchedule, type HabitWindow, type Prayer, type WindowEdge } from '../lib/types'
import { AreaPicker } from './AreaPicker'
import { EmojiInput } from './EmojiInput'
import { Button, cx, Input, Label, Modal, Segmented, Select, Toggle } from './ui'

type Draft = Pick<Habit, 'name' | 'emoji' | 'areaId' | 'schedule' | 'target' | 'unit' | 'window'> & {
  /** The round's size and where you are in it, as typed (ADR-038); empty size = no round. */
  roundSize: string
  roundAt: string
}
const blank: Draft = { name: '', emoji: '✨', areaId: null, schedule: { type: 'daily' }, target: 1, unit: '', window: null, roundSize: '', roundAt: '' }

/** Minutes before or after a prayer the editor offers. */
const OFFSETS = [-60, -45, -30, -20, -15, -10, -5, 0, 5, 10, 15, 20, 30, 45, 60, 90, 120]

// In the editor, a timed habit's specific days are the days its window *opens* — what the owner
// thinks in ("Thursday from Asr") — and they are stored as the days it counts for (ADR-043).
const toEditor = (s: HabitSchedule, w: HabitWindow | null): HabitSchedule => (s.type === 'days' ? { type: 'days', days: openingWeekdays(s.days, w) } : s)
const toStored = (s: HabitSchedule, w: HabitWindow | null): HabitSchedule => (s.type === 'days' ? { type: 'days', days: countWeekdays(s.days, w) } : s)

export function HabitEditor({ open, onClose, habit }: { open: boolean; onClose: () => void; habit?: Habit }) {
  const t = useI18n()
  const { m } = t
  const add = useStore((s) => s.addHabit)
  const update = useStore((s) => s.updateHabit)
  const remove = useStore((s) => s.deleteHabit)
  const today = useToday()
  const ctx = useWindowContext()
  const [d, setD] = useState<Draft>(blank)

  useEffect(() => {
    if (!open) return
    if (!habit) return setD(blank)
    const p = roundProgress(habit, useStore.getState().habitLogs, today)
    setD({ ...habit, schedule: toEditor(habit.schedule, habit.window), roundSize: p ? String(p.size) : '', roundAt: p ? String(p.into) : '' })
  }, [open, habit, today])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = () => {
    if (!d.name.trim()) return
    const { roundSize, roundAt, ...rest } = d
    const target = Math.max(1, d.target || 1)
    const round = isCounted({ target, unit: d.unit }) ? roundFromEditor(habit ?? null, Number(roundSize), Number(roundAt), useStore.getState().habitLogs, today) : null
    const clean = { ...rest, name: d.name.trim(), target, round, schedule: toStored(d.schedule, d.window) }
    if (habit) update(habit.id, clean)
    else add(clean)
    onClose()
  }

  const s = d.schedule
  const setType = (kind: HabitSchedule['type']) =>
    set('schedule', kind === 'daily' ? { type: 'daily' } : kind === 'days' ? { type: 'days', days: [0, 1, 2, 3, 4] } : { type: 'weekly', times: 3 })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? m.habits.editor.editTitle : m.habits.editor.newTitle}
      footer={
        <>
          {habit && (
            <Button variant="danger" className="me-auto" onClick={() => { if (confirm(t.f(m.habits.editor.deleteConfirm, { name: habit.name }))) { remove(habit.id); onClose() } }}>
              {m.common.delete}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>{m.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={!d.name.trim()}>{habit ? m.common.save : m.habits.editor.create}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={d.emoji} onChange={(v) => set('emoji', v)} />
          <Input autoFocus placeholder={m.habits.editor.namePlaceholder} value={d.name} onChange={(e) => set('name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <div>
          <Label>{m.common.area}</Label>
          <AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} />
        </div>
        <div>
          <Label>{m.habits.editor.howOften}</Label>
          <Segmented
            value={s.type}
            onChange={setType}
            options={[{ value: 'daily', label: m.habits.everyDay }, { value: 'days', label: m.habits.editor.specificDays }, { value: 'weekly', label: m.habits.editor.xTimesAWeek }]}
          />
          {s.type === 'days' && (
            <div className="mt-3 flex gap-1.5">
              {t.weekdays('short').map((n, i) => {
                const on = s.days.includes(i)
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('schedule', { type: 'days', days: on ? s.days.filter((x) => x !== i) : [...s.days, i] })}
                    className={cx('h-9 flex-1 rounded-lg text-xs font-semibold transition', on ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted')}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          )}
          {s.type === 'days' && d.window && d.window.nights > 0 && <p className="mt-1.5 text-xs text-muted">{m.habits.editor.openingDaysHint}</p>}
          {s.type === 'weekly' && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Input type="number" min={1} max={7} value={s.times} onChange={(e) => set('schedule', { type: 'weekly', times: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })} className="w-20" />
              {m.habits.editor.timesPerWeek}
            </div>
          )}
        </div>

        <WindowFields draft={d} onChange={(w) => set('window', w)} ctx={ctx} today={today} onLeave={onClose} />

        <div>
          <Label hint={m.habits.editor.targetHint}>{m.habits.editor.dailyTarget}</Label>
          <div className="flex gap-2">
            <Input type="number" min={1} value={d.target} onChange={(e) => set('target', Number(e.target.value))} className="w-28" />
            <Input placeholder={m.habits.editor.unitPlaceholder} value={d.unit} onChange={(e) => set('unit', e.target.value)} />
          </div>
        </div>
        {isCounted({ target: d.target || 1, unit: d.unit }) && (
          <div>
            <Label hint={m.habits.editor.roundHint}>{m.habits.editor.round}</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={0} placeholder={m.habits.editor.roundSizePlaceholder} value={d.roundSize} onChange={(e) => set('roundSize', e.target.value)} className="w-28" />
              <span className="truncate text-sm text-muted">{d.unit}</span>
            </div>
            {Number(d.roundSize) > 0 && (
              <div className="mt-3">
                <Label>{m.habits.editor.roundAt}</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} placeholder="0" value={d.roundAt} onChange={(e) => set('roundAt', e.target.value)} className="w-28" />
                  <span className="truncate text-sm text-muted">/ {t.n(Number(d.roundSize))} {d.unit}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

/**
 * "Only at certain times" (ADR-043): when the window opens and closes — a prayer give or take
 * minutes, or a clock time — on which day it closes, which day it counts for when that differs,
 * and its countdown. Below: the next window as a worked example, and what would go wrong.
 */
function WindowFields({ draft, onChange, ctx, today, onLeave }: {
  draft: Draft; onChange: (w: HabitWindow | null) => void; ctx: WindowContext; today: string; onLeave: () => void
}) {
  const t = useI18n()
  const E = t.m.habits.editor
  const w = draft.window
  const now = useTick(60_000, !!w)
  const set = (patch: Partial<HabitWindow>) => w && onChange({ ...w, ...patch })

  const turnOn = (on: boolean) => {
    if (!on) return onChange(null)
    // Asr to Maghrib is the owner's own example; without a location, clock times work at once.
    const p = (prayer: Prayer): WindowEdge => ({ kind: 'prayer', prayer, offset: 0 })
    onChange(ctx.place
      ? { start: p('asr'), end: p('maghrib'), nights: 0, countOn: 'start', countdown: true }
      : { start: { kind: 'time', time: '15:00' }, end: { kind: 'time', time: '17:00' }, nights: 0, countOn: 'start', countdown: true })
  }

  const check = useMemo(() => (w ? windowCheck(w, ctx, today) : null), [w, ctx, today])
  const stored = { schedule: toStored(draft.schedule, w), window: w }
  const next = w ? nextWindow(stored, now, today, ctx) : null
  const when = (ms: number) => t.f(t.m.habits.tile.dayTime, { day: t.d(new Date(ms), 'weekdayShort'), time: t.d(new Date(ms), 'time') })

  // With one opening day the count-day choice can name both days: "Thursday" / "Friday".
  const one = draft.schedule.type === 'days' && draft.schedule.days.length === 1 ? draft.schedule.days[0] : null
  const names = t.weekdays('long')

  return (
    <div className={cx('rounded-xl border p-3 transition', w ? 'border-accent/40 bg-accent/5' : 'border-border')}>
      <Toggle label={<span className="inline-flex items-center gap-1.5"><Clock size={15} /> {E.timed}</span>} checked={!!w} onChange={turnOn} />
      {!w && <p className="mt-1.5 text-xs text-muted">{E.timedHint}</p>}
      {w && (
        <div className="mt-3 space-y-3">
          <div>
            <Label>{E.opens}</Label>
            <EdgePicker value={w.start} onChange={(start) => set({ start })} ctx={ctx} today={today} t={t} />
          </div>
          <div>
            <Label>{E.closes}</Label>
            <EdgePicker value={w.end} onChange={(end) => set({ end })} ctx={ctx} today={today} t={t} />
            <Select className="mt-2" value={w.nights} aria-label={E.closes} onChange={(e) => set({ nights: Number(e.target.value) })}>
              {Array.from({ length: MAX_NIGHTS + 1 }, (_, n) => (
                <option key={n} value={n}>{n === 0 ? E.closesSameDay : n === 1 ? E.closesNextDay : t.p(E.closesLater, n)}</option>
              ))}
            </Select>
          </div>
          {w.nights > 0 && (
            <div>
              <Label hint={E.countsForHint}>{E.countsFor}</Label>
              <Segmented<HabitWindow['countOn']>
                value={w.countOn}
                onChange={(countOn) => set({ countOn })}
                options={[
                  { value: 'start', label: one === null ? E.dayItOpens : t.f(E.dayItOpensNamed, { day: names[one] }) },
                  { value: 'end', label: one === null ? E.dayItCloses : t.f(E.dayItClosesNamed, { day: names[(one + w.nights) % 7] }) },
                ]}
              />
            </div>
          )}
          <Toggle label={E.countdown} checked={w.countdown} onChange={(countdown) => set({ countdown })} />

          {check?.noPlace ? (
            <Warning>
              {rich(E.noPlace, { link: <button type="button" className="font-semibold underline" onClick={() => { onLeave(); navigate('settings', 'day') }}>{E.noPlaceLink}</button> })}
            </Warning>
          ) : check && check.backwards >= 366 ? (
            <Warning>{E.backwardsAlways}</Warning>
          ) : (
            <>
              {check && check.backwards > 0 && <Warning>{t.p(E.backwards, check.backwards)}</Warning>}
              {next && <p className="text-xs font-medium text-muted"><span className="tabular">{t.f(E.next, { opens: when(next.opens), closes: when(next.closes) })}</span></p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return <p className="flex items-start gap-1.5 text-xs text-gold"><AlertTriangle size={14} className="mt-px shrink-0" /><span>{children}</span></p>
}

/** A prayer and how many minutes from it, or a clock time. */
function EdgePicker({ value, onChange, ctx, today, t }: { value: WindowEdge; onChange: (e: WindowEdge) => void; ctx: WindowContext; today: string; t: I18n }) {
  const E = t.m.habits.editor
  const L = t.m.habits.window
  const times = ctx.place ? prayerTimes(today, ctx.place, ctx.asr) : null
  const pick = (v: string) => {
    if (v !== 'time') return onChange({ kind: 'prayer', prayer: v as Prayer, offset: value.kind === 'prayer' ? value.offset : 0 })
    // Switching a prayer to a set time starts from that prayer's time today, so it is a small step.
    const ms = value.kind === 'prayer' && times ? times[value.prayer] + value.offset * 60_000 : null
    const at = ms !== null && calendarKey(ms) === today ? new Date(ms) : null
    const hhmm = at ? `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : '15:00'
    onChange({ kind: 'time', time: hhmm })
  }
  const offsets = value.kind === 'prayer' && !OFFSETS.includes(value.offset) ? [...OFFSETS, value.offset].sort((a, b) => a - b) : OFFSETS
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={value.kind === 'time' ? 'time' : value.prayer} onChange={(e) => pick(e.target.value)}>
        {PRAYERS.map((p) => (
          <option key={p} value={p}>{times ? `${L.prayers[p]} · ${t.d(new Date(times[p]), 'time')}` : L.prayers[p]}</option>
        ))}
        <option value="time">{E.setTime}</option>
      </Select>
      {value.kind === 'prayer' ? (
        <Select value={value.offset} onChange={(e) => onChange({ ...value, offset: Number(e.target.value) })}>
          {offsets.map((o) => (
            <option key={o} value={o}>{o === 0 ? E.onTime : t.f(o > 0 ? E.offsetAfter : E.offsetBefore, { n: Math.abs(o) })}</option>
          ))}
        </Select>
      ) : (
        <Input type="time" dir="ltr" value={value.time} onChange={(e) => e.target.value && onChange({ kind: 'time', time: e.target.value })} />
      )}
    </div>
  )
}
