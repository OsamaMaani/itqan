import { LocateFixed, Moon, Sunrise } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { useI18n } from '../i18n/react'
import { fajrOn, fajrSpanAt, toKey } from '../lib/date'
import { deviceZone, FAJR_ANGLES, fajrIsOn, placeForZone, prayerTimes, resolveFajr } from '../lib/fajr'
import { spanText } from '../lib/habitWindows'
import { useTick, useWindowContext } from '../lib/hooks'
import { useStore } from '../lib/store'
import { PRAYERS, type HabitWindowSettings, type PrayerSettings } from '../lib/types'
import { Button, Card, cx, Input, Label, Segmented, SectionTitle, Select, Toggle } from './ui'

const round4 = (x: number) => Math.round(x * 10_000) / 10_000
const validLat = (x: number) => Number.isFinite(x) && x >= -90 && x <= 90
const validLng = (x: number) => Number.isFinite(x) && x >= -180 && x <= 180

/** The time zone's own name in the interface language ("Eastern European Time"), else its id. */
function zoneName(zone: string, locale: string): string {
  try {
    const part = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'longGeneric' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')
    return part?.value ?? zone
  } catch { return zone }
}

/** Settings → Day and prayers: where prayer times are reckoned, when a day starts, and how timed habits show. */
export function DayStartPanel() {
  return (
    <>
      <PrayerTimesCard />
      <DayStartCard />
      <TimedHabitsCard />
    </>
  )
}

/**
 * Where and how prayer times are reckoned (ADR-041, ADR-043): the place and Fajr angle, shared by
 * the day-start rule and timed habits, and the Asr method. Place and angle go through setDayStart,
 * which dates the change while a day starts at Fajr, so what is already done never changes day.
 */
function PrayerTimesCard() {
  const t = useI18n()
  const L = t.m.settings.dayStart
  const P = t.m.settings.prayer
  const fajr = useStore((s) => s.settings.fajr)
  const prayer = useStore((s) => s.settings.prayer)
  const spans = useStore((s) => s.fajrSpans)
  const setDayStart = useStore((s) => s.setDayStart)
  const updateSettings = useStore((s) => s.updateSettings)
  const on = fajrIsOn(spans)
  const zone = deviceZone()
  const zoned = placeForZone(zone)
  const ctx = useWindowContext()
  const nowMs = useTick(60_000)

  const [coords, setCoords] = useState(fajr.place !== null || !zoned)
  const [lat, setLat] = useState(String(fajr.place?.lat ?? zoned?.lat ?? ''))
  const [lng, setLng] = useState(String(fajr.place?.lng ?? zoned?.lng ?? ''))
  const [locating, setLocating] = useState(false)
  const [failed, setFailed] = useState(false)

  const usePlace = (place: { lat: number; lng: number } | null) => setDayStart(on, { place })
  const commitCoords = (a = Number(lat), b = Number(lng)) => {
    if (lat.trim() && lng.trim() && validLat(a) && validLng(b)) usePlace({ lat: round4(a), lng: round4(b) })
  }
  const locate = () => {
    setFailed(false)
    if (!('geolocation' in navigator)) { setFailed(true); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        const a = round4(p.coords.latitude), b = round4(p.coords.longitude)
        setLat(String(a)); setLng(String(b)); setCoords(true)
        usePlace({ lat: a, lng: b })
      },
      () => { setLocating(false); setFailed(true) },
      { timeout: 15_000, maximumAge: 3600_000 },
    )
  }

  const autoAngle = resolveFajr({ ...fajr, angle: null }, zone)?.angle
  const times = ctx.place ? prayerTimes(toKey(new Date(nowMs)), ctx.place, ctx.asr) : null
  const nextPrayer = times ? PRAYERS.find((p) => times[p] > nowMs) : undefined

  return (
    <Card className="space-y-4 p-5">
      <SectionTitle className="mb-0">{P.title}</SectionTitle>
      <p className="text-sm text-muted">{P.body}</p>
      {!ctx.place && <p className="text-sm text-gold">{P.unknownZone}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>{P.place}</Label>
          <Segmented<'zone' | 'coords'>
            value={coords ? 'coords' : 'zone'}
            onChange={(v) => { setCoords(v === 'coords'); if (v === 'zone' && zoned) usePlace(null) }}
            options={[...(zoned ? [{ value: 'zone' as const, label: L.fromZone }] : []), { value: 'coords' as const, label: L.coordinates }]}
          />
          {!coords && zoned && <p className="mt-1.5 text-xs text-muted">{t.f(L.zoneIs, { zone: zoneName(zone, t.locale) })}</p>}
        </div>
        {coords && (
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div><Label>{L.latitude}</Label><Input dir="ltr" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} onBlur={() => commitCoords()} onKeyDown={(e) => { if (e.key === 'Enter') commitCoords() }} placeholder="30.0444" /></div>
            <div><Label>{L.longitude}</Label><Input dir="ltr" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} onBlur={() => commitCoords()} onKeyDown={(e) => { if (e.key === 'Enter') commitCoords() }} placeholder="31.2357" /></div>
            <Button onClick={locate} disabled={locating}><LocateFixed size={16} /> {locating ? L.locating : L.useLocation}</Button>
            {failed && <p className="text-xs text-gold sm:col-span-3">{L.locationFailed}</p>}
          </div>
        )}
        <div>
          <Label>{L.angle}</Label>
          <Select value={fajr.angle === null ? 'auto' : String(fajr.angle)} onChange={(e) => setDayStart(on, { angle: e.target.value === 'auto' ? null : Number(e.target.value) })}>
            <option value="auto">{autoAngle === undefined ? L.angleAutoUnknown : t.f(L.angleAuto, { angle: t.n(autoAngle) })}</option>
            {FAJR_ANGLES.map((a) => <option key={a} value={a}>{t.f(L.angleValue, { angle: t.n(a) })}</option>)}
          </Select>
          <p className="mt-1.5 text-xs text-muted">{L.angleHint}</p>
        </div>
        <div>
          <Label>{P.asr}</Label>
          <Segmented<PrayerSettings['asr']>
            value={prayer.asr}
            onChange={(asr) => updateSettings({ prayer: { ...prayer, asr } })}
            options={[{ value: 'standard', label: P.asrStandard }, { value: 'hanafi', label: P.asrHanafi }]}
          />
          <p className="mt-1.5 text-xs text-muted">{P.asrHint}</p>
        </div>
      </div>

      {ctx.place && (
        <div>
          <Label>{P.todayTimes}</Label>
          {times ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
              {PRAYERS.map((p) => (
                <div key={p} className={cx('rounded-xl px-2 py-2 text-center', p === nextPrayer ? 'bg-accent/15 text-accent' : 'bg-surface-2')}>
                  <div className="text-[11px] font-semibold opacity-80">{t.m.habits.window.prayers[p]}</div>
                  <div className="tabular text-sm font-bold">{t.d(new Date(times[p]), 'time')}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">{P.noTimes}</p>
          )}
        </div>
      )}
    </Card>
  )
}

/**
 * When a day starts (ADR-041): midnight (the default) or Fajr, and the notice after completing
 * something. Every switch goes through setDayStart, which dates it, so nothing done changes day.
 */
function DayStartCard() {
  const t = useI18n()
  const L = t.m.settings.dayStart
  const fajr = useStore((s) => s.settings.fajr)
  const spans = useStore((s) => s.fajrSpans)
  const setDayStart = useStore((s) => s.setDayStart)
  const on = fajrIsOn(spans)
  const want = resolveFajr(fajr, deviceZone())
  const nowMs = useTick(60_000, on)

  // Today's Fajr where the rule is reckoned now: the open span's place, else where it would be.
  const span = on ? fajrSpanAt(nowMs) : null
  const shownAt = span ?? want
  const fajrMs = shownAt ? fajrOn(toKey(new Date(nowMs)), shownAt) : null

  return (
    <Card className="space-y-4 p-5">
      <SectionTitle className="mb-0">{L.title}</SectionTitle>
      <p className="text-sm text-muted">{L.body}</p>
      <Segmented<'midnight' | 'fajr'>
        value={on ? 'fajr' : 'midnight'}
        onChange={(v) => setDayStart(v === 'fajr')}
        options={[
          { value: 'midnight', label: <span className="inline-flex items-center gap-1.5"><Moon size={14} /> {L.midnight}</span> },
          { value: 'fajr', label: <span className="inline-flex items-center gap-1.5"><Sunrise size={14} /> {L.fajr}</span> },
        ]}
      />
      {!want && <p className="text-sm text-gold">{L.unknownZone}</p>}
      <p className="text-xs text-muted">{L.keeps}</p>
      {shownAt && <p className="text-sm">{fajrMs === null ? L.noFajrToday : t.f(L.fajrToday, { time: t.time(format(new Date(fajrMs), 'HH:mm')) })}</p>}
      <Toggle label={L.announce} checked={fajr.announce} disabled={!on} onChange={(v) => setDayStart(on, { announce: v })} />
    </Card>
  )
}

/** How long before it opens a timed habit appears on Today, in minutes (-1 all its day, 0 once open). */
const SHOW_BEFORE = [-1, 360, 180, 60, 30, 0]

/**
 * How timed habits show on Today (ADR-043): from when, and the two countdowns — each with a live
 * example from today's Asr and Maghrib, so the choice reads as what it will look like.
 */
function TimedHabitsCard() {
  const t = useI18n()
  const T = t.m.settings.timedHabits
  const W = t.m.habits.window
  const tile = t.m.habits.tile
  const prefs = useStore((s) => s.settings.habitWindows)
  const updateSettings = useStore((s) => s.updateSettings)
  const save = (patch: Partial<HabitWindowSettings>) => updateSettings({ habitWindows: { ...prefs, ...patch } })
  const ctx = useWindowContext()
  const nowMs = useTick(60_000)

  // The example: today's Asr to Maghrib where the owner is, or 3 PM to 5 PM without a location.
  const day = toKey(new Date(nowMs))
  const times = ctx.place ? prayerTimes(day, ctx.place, ctx.asr) : null
  const [y, m, d] = day.split('-').map(Number)
  const opens = times?.asr ?? new Date(y, m - 1, d, 15).getTime()
  const closes = times?.maghrib ?? new Date(y, m - 1, d, 17).getTime()
  const clock = (ms: number) => t.d(new Date(ms), 'time')
  const vars = { start: times ? W.prayers.asr : clock(opens), end: times ? W.prayers.maghrib : clock(closes), opens: clock(opens) }
  const example = prefs.showBefore < 0 ? t.f(T.exampleAllDay, vars)
    : prefs.showBefore === 0 ? t.f(T.exampleOnce, vars)
    : t.f(T.exampleBefore, { ...vars, shows: clock(opens - prefs.showBefore * 60_000) })
  const optionLabel = (n: number) => (n < 0 ? T.allDay : n === 0 ? T.onceOpen : n % 60 === 0 ? t.p(T.hoursBefore, n / 60) : t.f(T.minutesBefore, { n }))

  return (
    <Card className="space-y-4 p-5">
      <SectionTitle className="mb-0">{T.title}</SectionTitle>
      <p className="text-sm text-muted">{T.body}</p>
      <div>
        <Label>{T.showBefore}</Label>
        <Select value={prefs.showBefore} onChange={(e) => save({ showBefore: Number(e.target.value) })}>
          {(SHOW_BEFORE.includes(prefs.showBefore) ? SHOW_BEFORE : [...SHOW_BEFORE, prefs.showBefore]).map((n) => <option key={n} value={n}>{optionLabel(n)}</option>)}
        </Select>
        <p className="mt-1.5 text-xs text-muted">{example}</p>
        <p className="mt-1 text-xs text-muted">{T.afterClose}</p>
      </div>
      <div className="space-y-1.5">
        <Toggle label={T.countdownStart} checked={prefs.countdownStart} onChange={(v) => save({ countdownStart: v })} />
        <Example on={prefs.countdownStart} text={t.f(T.looksLike, { example: prefs.countdownStart ? t.f(tile.opensIn, { span: spanText(80 * 60_000, t), time: clock(opens) }) : t.f(tile.opensAt, { time: clock(opens) }) })} />
      </div>
      <div className="space-y-1.5">
        <Toggle label={T.countdownLeft} checked={prefs.countdownLeft} onChange={(v) => save({ countdownLeft: v })} />
        <Example on={prefs.countdownLeft} text={t.f(T.looksLike, { example: prefs.countdownLeft ? t.f(tile.left, { span: spanText(45 * 60_000, t), time: clock(closes) }) : t.f(tile.openUntil, { time: clock(closes) }) })} />
      </div>
      <p className="text-xs text-muted">{T.perHabit}</p>
    </Card>
  )
}

/** How a habit reads on Today with a countdown switch as it is, under that switch. */
function Example({ on, text }: { on: boolean; text: string }) {
  return <p className={cx('ps-14 text-xs', on ? 'text-accent' : 'text-muted')}><span className="tabular">{text}</span></p>
}
