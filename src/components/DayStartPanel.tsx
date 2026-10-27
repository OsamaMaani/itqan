import { LocateFixed, Moon, Sunrise } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { useI18n } from '../i18n/react'
import { fajrOn, fajrSpanAt, toKey } from '../lib/date'
import { deviceZone, FAJR_ANGLES, fajrIsOn, placeForZone, resolveFajr } from '../lib/fajr'
import { useTick } from '../lib/hooks'
import { useStore } from '../lib/store'
import { Button, Card, Input, Label, Segmented, SectionTitle, Select, Toggle } from './ui'

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

/**
 * Settings → When a day starts (ADR-041): midnight (the default) or Fajr, where Fajr is reckoned,
 * and the notice after completing something. Every switch goes through setDayStart, which dates it,
 * so what is already done never changes day.
 */
export function DayStartPanel() {
  const t = useI18n()
  const L = t.m.settings.dayStart
  const fajr = useStore((s) => s.settings.fajr)
  const spans = useStore((s) => s.fajrSpans)
  const setDayStart = useStore((s) => s.setDayStart)
  const on = fajrIsOn(spans)
  const zone = deviceZone()
  const zoned = placeForZone(zone)
  const want = resolveFajr(fajr, zone)
  const nowMs = useTick(60_000, on)

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

  // Today's Fajr where the rule is reckoned now: the open span's place, else where it would be.
  const span = on ? fajrSpanAt(nowMs) : null
  const shownAt = span ?? want
  const fajrMs = shownAt ? fajrOn(toKey(new Date(nowMs)), shownAt) : null
  const autoAngle = resolveFajr({ ...fajr, angle: null }, zone)?.angle

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>{L.place}</Label>
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
        <div className="self-center text-sm">
          {shownAt && (fajrMs === null ? L.noFajrToday : t.f(L.fajrToday, { time: t.time(format(new Date(fajrMs), 'HH:mm')) }))}
        </div>
      </div>

      <Toggle label={L.announce} checked={fajr.announce} disabled={!on} onChange={(v) => setDayStart(on, { announce: v })} />
    </Card>
  )
}
