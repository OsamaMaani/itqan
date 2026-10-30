import { AlertTriangle, Clock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useI18n, rich } from '../i18n/react'
import type { I18n } from '../i18n/core'
import { calendarKey } from '../lib/date'
import { prayerTimes } from '../lib/fajr'
import { isCounted, roundFromEditor, roundProgress } from '../lib/habits'
import { MAX_NIGHTS, nextWindow, opensInEvening, recount, spanText, windowCheck, windowDays, windowLabel, withDays, type WindowContext } from '../lib/habitWindows'
import { useTick, useToday, useWindowContext } from '../lib/hooks'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { PRAYERS, type Habit, type HabitSchedule, type HabitWindow, type Prayer, type WindowEdge } from '../lib/types'
import { AreaPicker } from './AreaPicker'
import { EmojiInput } from './EmojiInput'
import { WindowPicture } from './WindowPicture'
import { Button, cx, Input, Label, Modal, Segmented, Select, Toggle } from './ui'

type Draft = Pick<Habit, 'name' | 'emoji' | 'areaId' | 'schedule' | 'target' | 'unit' | 'window'> & {
  /** The round's size and where you are in it, as typed (ADR-038); empty size = no round. */
  roundSize: string
  roundAt: string
}
const blank: Draft = { name: '', emoji: '✨', areaId: null, schedule: { type: 'daily' }, target: 1, unit: '', window: null, roundSize: '', roundAt: '' }

/** Minutes before or after a prayer the editor offers. */
const OFFSETS = [-60, -45, -30, -20, -15, -10, -5, 0, 5, 10, 15, 20, 30, 45, 60, 90, 120]

const p = (prayer: Prayer, offset = 0): WindowEdge => ({ kind: 'prayer', prayer, offset })
/** Ready-made windows, one tap each; Friday also makes it a Friday habit. */
const PRESETS: { id: 'friday' | 'morning' | 'evening' | 'night'; emoji: string; window: Omit<HabitWindow, 'countdown'>; days?: number[] }[] = [
  { id: 'friday', emoji: '🕌', window: { start: p('maghrib'), end: p('maghrib'), nights: 1, countOn: 'end' }, days: [5] },
  { id: 'morning', emoji: '🌅', window: { start: p('fajr'), end: p('sunrise'), nights: 0, countOn: 'start' } },
  { id: 'evening', emoji: '🌇', window: { start: p('asr'), end: p('maghrib'), nights: 0, countOn: 'start' } },
  { id: 'night', emoji: '🌙', window: { start: p('isha'), end: p('fajr'), nights: 1, countOn: 'start' } },
]
const sameEdge = (a: WindowEdge, b: WindowEdge) => JSON.stringify(a) === JSON.stringify(b)

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
    setD({ ...habit, roundSize: p ? String(p.size) : '', roundAt: p ? String(p.into) : '' })
  }, [open, habit, today])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = () => {
    if (!d.name.trim()) return
    const { roundSize, roundAt, ...rest } = d
    const target = Math.max(1, d.target || 1)
    const round = isCounted({ target, unit: d.unit }) ? roundFromEditor(habit ?? null, Number(roundSize), Number(roundAt), useStore.getState().habitLogs, today) : null
    const clean = { ...rest, name: d.name.trim(), target, round }
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
          {s.type === 'weekly' && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Input type="number" min={1} max={7} value={s.times} onChange={(e) => set('schedule', { type: 'weekly', times: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })} className="w-20" />
              {m.habits.editor.timesPerWeek}
            </div>
          )}
        </div>

        <WindowFields draft={d} onChange={(patch) => setD((x) => ({ ...x, ...patch }))} ctx={ctx} today={today} onLeave={onClose} />

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
 * "Only at certain times" (ADR-043). The days picked under "How often" are the days it counts for;
 * here the window is set around them — from a prayer or clock time that day or days before, until
 * one that day or days after — so "from Thursday's Maghrib until Friday's" needs no further
 * question. Quick picks set the common ones in a tap; the picture shows every change at once.
 */
function WindowFields({ draft, onChange, ctx, today, onLeave }: {
  draft: Draft; onChange: (patch: Partial<Draft>) => void; ctx: WindowContext; today: string; onLeave: () => void
}) {
  const t = useI18n()
  const E = t.m.habits.editor
  const w = draft.window
  const now = useTick(60_000, !!w)
  const set = (next: HabitWindow) => onChange({ window: next })

  const turnOn = (on: boolean) => {
    if (!on) return onChange({ window: null })
    // Asr to Maghrib is the owner's own example; without a location, clock times work at once.
    onChange({
      window: ctx.place
        ? { start: p('asr'), end: p('maghrib'), nights: 0, countOn: 'start', countdown: true }
        : { start: { kind: 'time', time: '15:00' }, end: { kind: 'time', time: '17:00' }, nights: 0, countOn: 'start', countdown: true },
    })
  }

  const check = useMemo(() => (w ? windowCheck(w, ctx, today) : null), [w, ctx, today])
  const next = w ? nextWindow(draft, now, today, ctx) : null
  const when = (ms: number) => t.f(t.m.habits.tile.dayTime, { day: t.d(new Date(ms), 'weekdayShort'), time: t.d(new Date(ms), 'time') })

  // With one day picked, the day choices name weekdays: "From Thursday … until Friday".
  const one = draft.schedule.type === 'days' && draft.schedule.days.length === 1 ? draft.schedule.days[0] : null
  const names = t.weekdays('long')
  const dayName = (k: number, rel: string) => (one === null ? rel : k < 2 ? names[(((one + k) % 7) + 7) % 7] : t.f(E.dayFar, { day: names[(((one + k) % 7) + 7) % 7], rel }))
  const startDay = (k: number) => dayName(-k, k === 0 ? E.startDays.same : k === 1 ? E.startDays.before : t.p(E.startDays.more, k))
  const endDay = (k: number) => dayName(k, k === 0 ? E.endDays.same : k === 1 ? E.endDays.after : t.p(E.endDays.more, k))

  const preset = (id: (typeof PRESETS)[number]['id']) => {
    const pr = PRESETS.find((x) => x.id === id)!
    onChange({ window: { ...pr.window, countdown: w?.countdown ?? true }, ...(pr.days ? { schedule: { type: 'days', days: pr.days } } : {}) })
  }
  const isPreset = (pr: (typeof PRESETS)[number]) => !!w && sameEdge(w.start, pr.window.start) && sameEdge(w.end, pr.window.end)
    && w.nights === pr.window.nights && (w.nights === 0 || w.countOn === pr.window.countOn)
    && (!pr.days || (draft.schedule.type === 'days' && draft.schedule.days.join() === pr.days.join()))
  const days = w ? windowDays(w) : null
  // Across two days, which normal day it is saved on; the one the Islamic day (from Maghrib) agrees with is tagged.
  const opening = one === null || !days ? null : (((one - days.before) % 7) + 7) % 7
  const islamic = w && w.nights === 1 && opensInEvening(w, ctx, today) ? 'end' : null

  return (
    <div className={cx('rounded-xl border p-3 transition', w ? 'border-accent/40 bg-accent/5' : 'border-border')}>
      <Toggle label={<span className="inline-flex items-center gap-1.5"><Clock size={15} /> {E.timed}</span>} checked={!!w} onChange={turnOn} />
      {!w && <p className="mt-1.5 text-xs text-muted">{E.timedHint}</p>}
      {w && days && (
        <div className="mt-3 space-y-3">
          <div>
            <Label>{E.quick}</Label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {PRESETS.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  aria-pressed={isPreset(pr)}
                  onClick={() => preset(pr.id)}
                  className={cx('rounded-lg border px-2 py-1.5 text-start transition', isPreset(pr) ? 'border-accent bg-accent/15' : 'border-border bg-surface hover:border-text/20')}
                >
                  <span className="block text-xs font-semibold">{pr.emoji} {E.presets[pr.id]}</span>
                  <span className="block text-[10px] leading-tight text-muted">{windowLabel({ ...pr.window, countdown: true }, t, pr.days?.[0] ?? null)}</span>
                </button>
              ))}
            </div>
          </div>

          <WindowPicture w={w} schedule={draft.schedule} ctx={ctx} today={today} now={now}>
            {w.nights > 0 && (
              <div className="mt-3">
                <Label hint={E.countsOnHint}>{E.countsOn}</Label>
                <Segmented<HabitWindow['countOn']>
                  className="flex w-full *:flex-1"
                  value={w.countOn}
                  onChange={(on) => onChange(recount(draft.schedule, w, on))}
                  options={(['start', 'end'] as const).map((on) => ({
                    value: on,
                    label: (
                      <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5">
                        {opening === null ? (on === 'start' ? E.dayStarts : E.dayEnds) : names[(opening + (on === 'end' ? w.nights : 0)) % 7]}
                        {on === islamic && <span className="rounded bg-gold/15 px-1 text-[10px] font-semibold text-gold">☪ {E.islamic}</span>}
                      </span>
                    ),
                  }))}
                />
              </div>
            )}
          </WindowPicture>

          <div>
            <Label>{E.from}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1">
                <Select aria-label={E.from} value={days.before} onChange={(e) => set(withDays(w, { before: Number(e.target.value) }))}>
                  {Array.from({ length: MAX_NIGHTS + 1 }, (_, k) => <option key={k} value={k}>{startDay(k)}</option>)}
                </Select>
              </div>
              <EdgePicker value={w.start} onChange={(start) => set({ ...w, start })} ctx={ctx} today={today} t={t} />
            </div>
          </div>
          <div>
            <Label>{E.until}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1">
                <Select aria-label={E.until} value={days.after} onChange={(e) => set(withDays(w, { after: Number(e.target.value) }))}>
                  {Array.from({ length: MAX_NIGHTS + 1 }, (_, k) => <option key={k} value={k}>{endDay(k)}</option>)}
                </Select>
              </div>
              <EdgePicker value={w.end} onChange={(end) => set({ ...w, end })} ctx={ctx} today={today} t={t} />
            </div>
          </div>
          <Toggle label={E.countdown} checked={w.countdown} onChange={(countdown) => set({ ...w, countdown })} />

          {check?.noPlace ? (
            <Warning>
              {rich(E.noPlace, { link: <button type="button" className="font-semibold underline" onClick={() => { onLeave(); navigate('settings', 'day') }}>{E.noPlaceLink}</button> })}
            </Warning>
          ) : check && check.backwards >= 366 ? (
            <Warning>{E.backwardsAlways}</Warning>
          ) : (
            <>
              {check && check.backwards > 0 && <Warning>{t.p(E.backwards, check.backwards)}</Warning>}
              {next && <p className="text-xs font-medium text-muted"><span className="tabular">{t.f(E.next, { opens: when(next.opens), closes: when(next.closes), span: spanText(next.closes - next.opens, t) })}</span></p>}
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
    <>
      <Select value={value.kind === 'time' ? 'time' : value.prayer} onChange={(e) => pick(e.target.value)}>
        {PRAYERS.map((p) => (
          <option key={p} value={p}>{L.prayers[p]}</option>
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
    </>
  )
}
