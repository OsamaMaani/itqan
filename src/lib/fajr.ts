import type { DateKey, FajrSettings, FajrSpan } from './types'

/**
 * Fajr times (ADR-041), for the optional rule that a day starts at Fajr instead of midnight.
 *
 * The standard astronomical method (the one praytimes.org and the adhan library use): Fajr is the
 * moment before sunrise when the sun is `angle` degrees below the horizon. Where the sun never gets
 * that low (high latitudes in summer) — or gets there implausibly early — Fajr is taken as
 * angle/60 of the night before sunrise, the "angle-based" rule. Where the sun does not rise at all
 * there is no Fajr, and the day starts at midnight as usual.
 *
 * Pure and deterministic: the same day and place always give the same instant, which is what lets
 * a stored rule date the past without anything moving (date.ts).
 */

const RAD = Math.PI / 180
const sin = (d: number) => Math.sin(d * RAD)
const cos = (d: number) => Math.cos(d * RAD)
const asin = (x: number) => Math.asin(x) / RAD
const acos = (x: number) => Math.acos(x) / RAD
const atan2 = (y: number, x: number) => Math.atan2(y, x) / RAD
const fix = (a: number, b: number) => { const r = a - b * Math.floor(a / b); return r < 0 ? r + b : r }

/** Sun's declination and the equation of time (hours) at Julian date `jd`. */
function sun(jd: number): { decl: number; eqt: number } {
  const D = jd - 2451545.0
  const g = fix(357.529 + 0.98560028 * D, 360)
  const q = fix(280.459 + 0.98564736 * D, 360)
  const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360)
  const e = 23.439 - 0.00000036 * D
  const ra = fix(atan2(cos(e) * sin(L), cos(L)) / 15, 24)
  return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - ra }
}

function julian(y: number, m: number, d: number): number {
  if (m <= 2) { y -= 1; m += 12 }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5
}

/** Hours (UTC + longitude/15) when the sun is `angle` below the horizon; NaN if it never is. */
function angleTime(jd: number, lat: number, angle: number, hours: number, before: boolean): number {
  const { decl, eqt } = sun(jd + hours / 24)
  const noon = fix(12 - eqt, 24)
  const T = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15
  return noon + (before ? -T : T)
}

const cache = new Map<string, number | null>()

/** The instant of Fajr on local day `k` at a place, as epoch ms; null where the sun does not rise. */
export function fajrMs(k: DateKey, lat: number, lng: number, angle: number): number | null {
  const id = `${k}|${lat}|${lng}|${angle}`
  const hit = cache.get(id)
  if (hit !== undefined) return hit
  const [y, m, d] = k.split('-').map(Number)
  const jd = julian(y, m, d) - lng / (15 * 24)
  // Two refinements from the usual first guesses (praytimes): plenty for minute accuracy.
  let fajr = 5, sunrise = 6, sunset = 18
  for (let i = 0; i < 2; i++) {
    fajr = angleTime(jd, lat, angle, fajr, true)
    sunrise = angleTime(jd, lat, 0.833, sunrise, true)
    sunset = angleTime(jd, lat, 0.833, sunset, false)
    if (Number.isNaN(fajr)) fajr = 5
  }
  fajr = angleTime(jd, lat, angle, fajr, true)
  let out: number | null = null
  if (!Number.isNaN(sunrise) && !Number.isNaN(sunset)) {
    const portion = (angle / 60) * fix(sunrise - sunset, 24)
    if (Number.isNaN(fajr) || fix(sunrise - fajr, 24) > portion) fajr = sunrise - portion
    out = Date.UTC(y, m - 1, d) + Math.round((fajr - lng / 15) * 3600_000)
  }
  if (cache.size > 5000) cache.clear()
  cache.set(id, out)
  return out
}

/** A place Fajr is reckoned for. */
export interface FajrPlaceInfo {
  lat: number
  lng: number
  /** The usual Fajr angle there, from the local authority's method. */
  angle: number
}

// The angles of the usual calculation methods, by the authority that uses them.
const EGYPT = 19.5, UMM_AL_QURA = 18.5, MWL = 18, ISNA = 15, SEA = 20, FRANCE = 12

/**
 * The main city of common time zones, with its usual Fajr angle — so "the time zone you live in"
 * is enough to start. A zone that spans a wide country (India, the US zones) is approximate there;
 * coordinates in Settings make it exact.
 */
const ZONES: Record<string, FajrPlaceInfo> = {
  'Africa/Cairo': { lat: 30.0444, lng: 31.2357, angle: EGYPT },
  'Africa/Khartoum': { lat: 15.5007, lng: 32.5599, angle: EGYPT },
  'Africa/Tripoli': { lat: 32.8872, lng: 13.1913, angle: MWL },
  'Africa/Tunis': { lat: 36.8065, lng: 10.1815, angle: MWL },
  'Africa/Algiers': { lat: 36.7538, lng: 3.0588, angle: MWL },
  'Africa/Casablanca': { lat: 33.5731, lng: -7.5898, angle: 19 },
  'Africa/Nouakchott': { lat: 18.0735, lng: -15.9582, angle: MWL },
  'Africa/Dakar': { lat: 14.7167, lng: -17.4677, angle: MWL },
  'Africa/Lagos': { lat: 6.5244, lng: 3.3792, angle: MWL },
  'Africa/Mogadishu': { lat: 2.0469, lng: 45.3182, angle: MWL },
  'Africa/Nairobi': { lat: -1.2921, lng: 36.8219, angle: MWL },
  'Africa/Addis_Ababa': { lat: 9.03, lng: 38.74, angle: MWL },
  'Africa/Johannesburg': { lat: -26.2041, lng: 28.0473, angle: MWL },
  'Asia/Riyadh': { lat: 24.7136, lng: 46.6753, angle: UMM_AL_QURA },
  'Asia/Aden': { lat: 15.3694, lng: 44.191, angle: UMM_AL_QURA },
  'Asia/Bahrain': { lat: 26.2235, lng: 50.5876, angle: UMM_AL_QURA },
  'Asia/Dubai': { lat: 25.2048, lng: 55.2708, angle: 18.2 },
  'Asia/Qatar': { lat: 25.2854, lng: 51.531, angle: MWL },
  'Asia/Kuwait': { lat: 29.3759, lng: 47.9774, angle: MWL },
  'Asia/Muscat': { lat: 23.588, lng: 58.3829, angle: MWL },
  'Asia/Amman': { lat: 31.9539, lng: 35.9106, angle: MWL },
  'Asia/Damascus': { lat: 33.5138, lng: 36.2765, angle: MWL },
  'Asia/Beirut': { lat: 33.8938, lng: 35.5018, angle: MWL },
  'Asia/Baghdad': { lat: 33.3152, lng: 44.3661, angle: MWL },
  'Asia/Jerusalem': { lat: 31.7683, lng: 35.2137, angle: MWL },
  'Asia/Gaza': { lat: 31.5017, lng: 34.4668, angle: EGYPT },
  'Asia/Hebron': { lat: 31.5326, lng: 35.0998, angle: EGYPT },
  'Asia/Tehran': { lat: 35.6892, lng: 51.389, angle: 17.7 },
  'Asia/Baku': { lat: 40.4093, lng: 49.8671, angle: MWL },
  'Asia/Kabul': { lat: 34.5553, lng: 69.2075, angle: MWL },
  'Asia/Karachi': { lat: 24.8607, lng: 67.0011, angle: MWL },
  'Asia/Kolkata': { lat: 28.6139, lng: 77.209, angle: MWL },
  'Asia/Calcutta': { lat: 28.6139, lng: 77.209, angle: MWL },
  'Asia/Dhaka': { lat: 23.8103, lng: 90.4125, angle: MWL },
  'Asia/Tashkent': { lat: 41.2995, lng: 69.2401, angle: MWL },
  'Asia/Almaty': { lat: 43.222, lng: 76.8512, angle: MWL },
  'Asia/Kuala_Lumpur': { lat: 3.139, lng: 101.6869, angle: SEA },
  'Asia/Singapore': { lat: 1.3521, lng: 103.8198, angle: SEA },
  'Asia/Jakarta': { lat: -6.2088, lng: 106.8456, angle: SEA },
  'Asia/Brunei': { lat: 4.9031, lng: 114.9398, angle: SEA },
  'Asia/Shanghai': { lat: 31.2304, lng: 121.4737, angle: MWL },
  'Asia/Hong_Kong': { lat: 22.3193, lng: 114.1694, angle: MWL },
  'Asia/Tokyo': { lat: 35.6762, lng: 139.6503, angle: MWL },
  'Asia/Seoul': { lat: 37.5665, lng: 126.978, angle: MWL },
  'Europe/Istanbul': { lat: 41.0082, lng: 28.9784, angle: MWL },
  'Europe/Moscow': { lat: 55.7558, lng: 37.6173, angle: 16 },
  'Europe/London': { lat: 51.5074, lng: -0.1278, angle: MWL },
  'Europe/Dublin': { lat: 53.3498, lng: -6.2603, angle: MWL },
  'Europe/Paris': { lat: 48.8566, lng: 2.3522, angle: FRANCE },
  'Europe/Brussels': { lat: 50.8503, lng: 4.3517, angle: MWL },
  'Europe/Amsterdam': { lat: 52.3676, lng: 4.9041, angle: MWL },
  'Europe/Berlin': { lat: 52.52, lng: 13.405, angle: MWL },
  'Europe/Vienna': { lat: 48.2082, lng: 16.3738, angle: MWL },
  'Europe/Zurich': { lat: 47.3769, lng: 8.5417, angle: MWL },
  'Europe/Madrid': { lat: 40.4168, lng: -3.7038, angle: MWL },
  'Europe/Rome': { lat: 41.9028, lng: 12.4964, angle: MWL },
  'Europe/Athens': { lat: 37.9838, lng: 23.7275, angle: MWL },
  'Europe/Sarajevo': { lat: 43.8563, lng: 18.4131, angle: MWL },
  'Europe/Stockholm': { lat: 59.3293, lng: 18.0686, angle: MWL },
  'Europe/Oslo': { lat: 59.9139, lng: 10.7522, angle: MWL },
  'America/New_York': { lat: 40.7128, lng: -74.006, angle: ISNA },
  'America/Toronto': { lat: 43.6532, lng: -79.3832, angle: ISNA },
  'America/Chicago': { lat: 41.8781, lng: -87.6298, angle: ISNA },
  'America/Denver': { lat: 39.7392, lng: -104.9903, angle: ISNA },
  'America/Phoenix': { lat: 33.4484, lng: -112.074, angle: ISNA },
  'America/Los_Angeles': { lat: 34.0522, lng: -118.2437, angle: ISNA },
  'America/Vancouver': { lat: 49.2827, lng: -123.1207, angle: ISNA },
  'America/Mexico_City': { lat: 19.4326, lng: -99.1332, angle: MWL },
  'America/Sao_Paulo': { lat: -23.5505, lng: -46.6333, angle: MWL },
  'Australia/Sydney': { lat: -33.8688, lng: 151.2093, angle: MWL },
  'Australia/Melbourne': { lat: -37.8136, lng: 144.9631, angle: MWL },
}

/** This device's IANA time zone ("Africa/Cairo"), or '' when the browser does not say. */
export function deviceZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '' } catch { return '' }
}

/** Where Fajr is reckoned for a time zone, or null for a zone Itqan has no city for. */
export function placeForZone(zone: string): FajrPlaceInfo | null {
  return ZONES[zone] ?? null
}

/** The usual angle near a point: the method of the nearest known city. */
export function angleNear(lat: number, lng: number): number {
  let best = MWL, dist = Infinity
  for (const p of Object.values(ZONES)) {
    const d = (p.lat - lat) ** 2 + ((p.lng - lng) * cos(lat)) ** 2
    if (d < dist) { dist = d; best = p.angle }
  }
  return best
}

/** Fajr angles offered in Settings, in degrees. */
export const FAJR_ANGLES = [12, 15, 16, 17.7, 18, 18.2, 18.5, 19, 19.5, 20] as const

/** Where and at what angle a span started now would reckon Fajr; null when the place is unknown. */
export function resolveFajr(f: FajrSettings, zone: string): FajrPlaceInfo | null {
  const zoned = placeForZone(zone)
  const base = f.place ?? zoned
  if (!base) return null
  return { lat: base.lat, lng: base.lng, angle: f.angle ?? (f.place ? angleNear(base.lat, base.lng) : zoned!.angle) }
}

/** True while a day starts at Fajr: some span is still open. */
export function fajrIsOn(spans: readonly FajrSpan[]): boolean {
  return spans.some((s) => s.to === null)
}

/**
 * The spans after switching the rule at `now` (ADR-041). Off closes every open span; on at a place
 * keeps an open span already there and otherwise closes it and opens a new one. Nothing is ever
 * removed or re-opened, so every moment already lived keeps the day it had.
 */
export function switchFajr(spans: readonly FajrSpan[], want: FajrPlaceInfo | null, now: string, id: string): FajrSpan[] {
  const same = (s: FajrSpan) => !!want && s.lat === want.lat && s.lng === want.lng && s.angle === want.angle
  const open = spans.filter((s) => s.to === null)
  if (want && open.length === 1 && same(open[0])) return [...spans]
  // A clock behind a span's start (another device's) closes it at its start: empty, so unused.
  const closed = spans.map((s) => (s.to === null ? { ...s, to: now > s.from ? now : s.from } : s))
  return want ? [...closed, { id, from: now, to: null, lat: want.lat, lng: want.lng, angle: want.angle, createdAt: now }] : closed
}
