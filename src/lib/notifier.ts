import { tx } from '../i18n/core'
import { create } from 'zustand'
import { checkIn } from './connections'
import { toKey } from './date'
import { buildPushRequest, type PushMessage, type PushRequest } from './push'
import { at, buildSchedule, timerAlert, type ScheduledAlert } from './reminders'
import { useStore } from './store'
import { toast } from './toast'
import type { NotifySettings, PushKinds, PushTarget, Reminder } from './types'

/**
 * Keeps the desktop helper (scripts/itqan_reminders.py) in sync with the reminders, so alerts
 * arrive even when Itqan is closed (ADR-013). The token is baked into the local build by
 * scripts/install_local.sh; builds without it (dev, GitHub Pages) fall back to in-app alerts
 * while the app is open.
 *
 * What is announced follows Settings → Notifications (ADR-031): the device's own choices, and every
 * device registered for pushes that wants that kind — timer ends, reminders, check-ins (ADR-033) —
 * whose push the helper sends at the same time.
 */

const URL = 'http://127.0.0.1:47321'
const TOKEN = (import.meta.env.VITE_ITQAN_HELPER_TOKEN as string | undefined) ?? ''

export type HelperState = 'checking' | 'connected' | 'offline' | 'unauthorized' | 'unavailable'

export const useNotifier = create<{ state: HelperState; next: number | null; pending: number; push: boolean }>(() => ({
  state: TOKEN ? 'checking' : 'unavailable',
  next: null,
  pending: 0,
  /** The running helper can send pushes (v2+); an older one needs install_local.sh re-run. */
  push: false,
}))

/** True in the locally installed laptop app, whose alerts go through the desktop helper. */
export const HAS_HELPER = !!TOKEN

const notify = (): NotifySettings => useStore.getState().settings.notify
/** Whether this device announces alerts of this kind. */
export function wants(kind: Exclude<keyof NotifySettings, 'on'>): boolean {
  const n = notify()
  return n.on && n[kind]
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(URL + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Itqan-Token': TOKEN, ...(init.headers ?? {}) },
  })
}

/** A 10:00 desktop nudge on the day each person's check-in falls due (ADR-018). */
export function checkInAlerts(now: Date): ScheduledAlert[] {
  const { contacts, interactions } = useStore.getState()
  const today = toKey(now)
  const out: ScheduledAlert[] = []
  for (const c of contacts) {
    const ci = checkIn(c, interactions, today)
    if (!ci.due || ci.due < today) continue // overdue ones were already announced on their day
    const fireAt = at({ time: '10:00' } as Reminder, ci.due).getTime()
    if (fireAt < now.getTime() - 12 * 3600_000) continue
    out.push({ key: `checkin|${c.id}|${ci.due}`, fireAt, title: `🫶 ${tx().f(tx().m.store.checkInTitle, { name: c.name })}`, body: tx().m.store.checkInBody, urgent: false })
  }
  return out
}

/**
 * A timer that ran out keeps its alert in the schedule a little longer: the app finishes it the
 * moment it ends, and the re-sync that follows must not pull the alert before the helper (which
 * checks every 15 s) has fired it. One stopped early is dropped at once.
 */
const ENDED_KEEP_MS = 5 * 60_000
let ended: ScheduledAlert[] = []

function timerAlerts(now: number): ScheduledAlert[] {
  ended = ended.filter((a) => a.fireAt > now - ENDED_KEEP_MS)
  const live = timerAlert(useStore.getState().timer)
  return live ? [...ended, live] : ended
}

/** What the helper receives: an alert, whether it shows on this desktop, and pushes for other devices. */
export type HelperItem = ScheduledAlert & { desktop?: boolean; push?: PushRequest[]; pushLateMs?: number }

type Kind = keyof PushKinds

/**
 * How long after its time a push may still go out (helper v3 honours it; older helpers keep 10
 * minutes). A timer's end is noise an hour later; a reminder or check-in is still worth hearing
 * about when the laptop wakes in the morning (ADR-033). The push's own signature expires then too.
 */
const PUSH_LATE_MS: Record<Kind, number> = { timer: 10 * 60_000, reminders: 12 * 3600_000, checkIns: 12 * 3600_000 }
/** The push's signature outlives that window a little, so a push sent at its last minute is not refused for clock skew. */
const PUSH_SIGNATURE_MARGIN_MS = 20 * 60_000
/**
 * Pushes are built for the coming week only: each is encrypted and signed separately, and a year of
 * daily reminders for every phone would not fit what the helper accepts. The hourly re-sync rolls
 * the window, so this only matters if the laptop app is not opened for a week (ADR-033).
 */
export const PUSH_HORIZON_MS = 7 * 86_400_000

/** The helper takes at most this many pushes per alert, and refuses the whole schedule beyond it. */
const MAX_PUSH_TARGETS = 10

/**
 * Web Push carries about 4 KB, and the helper refuses a push body over 8000 base64 characters —
 * again the whole schedule. A reminder's notes can be longer, so the push shows the start of them;
 * at four bytes a character this still fits.
 */
export function pushMessage(kind: Kind, a: ScheduledAlert): PushMessage {
  const clip = (text: string, n: number) => {
    const cs = Array.from(text)
    return cs.length > n ? `${cs.slice(0, n - 1).join('')}…` : text
  }
  return { title: clip(a.title, 120), body: clip(a.body, 480), tag: alertTag(kind, a) }
}

/** One push per alert per device, kept across syncs: encryption is fresh each time, so rebuilding would only cost time. */
let pushCache = new Map<string, Promise<PushRequest | null>>()

/** The notification tag: a newer notification with the same tag replaces the older one, so a push and the page's own alert never stack. */
export function alertTag(kind: Kind, a: ScheduledAlert): string {
  return kind === 'timer' ? 'itqan-timer' : `itqan-${a.key}`
}

/** Every alert the helper should know of, by kind — whether or not this device announces it, since a phone may want it pushed. */
function allAlerts(reminders: Reminder[], now: Date, horizonDays?: number): { kind: Kind; alert: ScheduledAlert }[] {
  return [
    ...timerAlerts(now.getTime()).map((alert) => ({ kind: 'timer' as const, alert })),
    ...buildSchedule(reminders, now, horizonDays).map((alert) => ({ kind: 'reminders' as const, alert })),
    ...checkInAlerts(now).map((alert) => ({ kind: 'checkIns' as const, alert })),
  ]
}

/**
 * Alerts as the helper should fire them (ADR-031, ADR-033): on this desktop when this device wants
 * that kind, and pushed to every registered device that wants it.
 */
export async function helperItems(reminders: Reminder[], now: Date): Promise<HelperItem[]> {
  const targets = useStore.getState().pushTargets
  const prev = pushCache
  const next = new Map<string, Promise<PushRequest | null>>()
  const out: HelperItem[] = []
  for (const { kind, alert: a } of allAlerts(reminders, now)) {
    const desktop = wants(kind)
    const pushable = kind === 'timer' || a.fireAt <= now.getTime() + PUSH_HORIZON_MS
    const reqs: Promise<PushRequest | null>[] = []
    for (const t of pushable ? targets.filter((x) => x.kinds?.[kind]).slice(0, MAX_PUSH_TARGETS) : []) {
      // Everything that goes into the request: an edited title or a renewed subscription builds a new one.
      const k = JSON.stringify([a.key, a.fireAt, a.title, a.body, t.id, t.endpoint, t.p256dh, t.auth, t.vapidPublic])
      let p = next.get(k) ?? prev.get(k)
      if (!p) p = buildPushRequest(t, pushMessage(kind, a), a.fireAt + PUSH_LATE_MS[kind] + PUSH_SIGNATURE_MARGIN_MS).catch(() => null)
      next.set(k, p)
      reqs.push(p)
    }
    const push = (await Promise.all(reqs)).filter((p): p is PushRequest => !!p)
    if (desktop || push.length) out.push({ ...a, desktop, push, pushLateMs: PUSH_LATE_MS[kind] })
  }
  pushCache = next
  return out
}

/** Reminder and check-in alerts this device announces itself (ADR-031). */
function alertsFor(reminders: Reminder[], now: Date, horizonDays?: number): { kind: Kind; alert: ScheduledAlert }[] {
  return allAlerts(reminders, now, horizonDays).filter((x) => x.kind !== 'timer' && wants(x.kind))
}

/** True when the helper is announcing the timer's end, so the page should not do it as well. */
export function helperAnnouncesTimer(): boolean {
  const s = useNotifier.getState().state
  return s === 'connected' || s === 'checking'
}

export async function syncReminders(reminders: Reminder[]): Promise<void> {
  if (!TOKEN) return
  try {
    const items = await helperItems(reminders, new Date())
    const res = await call('/schedule', { method: 'PUT', body: JSON.stringify({ items }) })
    if (res.status === 401) return void useNotifier.setState({ state: 'unauthorized' })
    if (!res.ok) throw new Error(String(res.status))
    const h = await (await call('/health')).json()
    useNotifier.setState({ state: 'connected', next: h.next ?? null, pending: h.pending ?? 0, push: h.push === true })
  } catch {
    useNotifier.setState({ state: 'offline' })
  }
}

export async function sendTestNotification(): Promise<boolean> {
  if (useNotifier.getState().state === 'connected') {
    try { return (await call('/test', { method: 'POST', body: '{}' })).ok } catch { return false }
  }
  toast({ emoji: '🔔', message: tx().m.store.notificationsWork })
  return showSystemNotification('Itqan', tx().m.store.notificationsWork, { force: true })
}

/** Sends a test push to one registered device now, through the helper. */
export async function sendTestPush(t: PushTarget): Promise<boolean> {
  if (useNotifier.getState().state !== 'connected') return false
  try {
    const req = await buildPushRequest(t, { title: '🔔 Itqan', body: tx().m.store.pushWorks, tag: 'itqan-test' }, Date.now() + PUSH_SIGNATURE_MARGIN_MS)
    return (await call('/test', { method: 'POST', body: JSON.stringify({ push: [req] }) })).ok
  } catch {
    return false
  }
}

/**
 * The page's own system notification, when the browser allows it. Through the service worker
 * when there is one — the only way a home-screen app on iPhone can show one — else the plain
 * Notification. Never asks for permission: that is asked once, from Settings (ADR-031).
 * Returns false when nothing could be shown (the caller's toast is then all there is).
 */
export async function showSystemNotification(title: string, body: string, o: { urgent?: boolean; tag?: string; force?: boolean } = {}): Promise<boolean> {
  if (!o.force && !notify().on) return false
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false
    const options: NotificationOptions = { body, icon: 'icon-192.png', tag: o.tag, requireInteraction: o.urgent }
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
    return true
  } catch {
    return false
  }
}

function inAppNotify(title: string, body: string, urgent: boolean, tag: string): void {
  toast({ emoji: '🔔', message: `${title} — ${body.split('\n')[0]}` }, urgent ? 20000 : 8000)
  void showSystemNotification(title, body, { urgent, tag })
}

let started = false

/** Called once from App. Syncs on load, on every reminder or timer change, and hourly (rolls the horizon). */
export function startNotifier(): void {
  if (started) return
  started = true

  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => syncReminders(useStore.getState().reminders), 400)
  }
  schedule()
  useStore.subscribe((s, prev) => {
    if (s.timer !== prev.timer) {
      const a = timerAlert(prev.timer)
      if (a && a.fireAt <= Date.now()) ended.push(a)
      schedule()
    }
    if (s.reminders !== prev.reminders || s.contacts !== prev.contacts || s.interactions !== prev.interactions) schedule()
    if (s.pushTargets !== prev.pushTargets || s.settings.notify !== prev.settings.notify) schedule()
  })
  setInterval(schedule, 60 * 60 * 1000)

  // Fallback while the app is open and the helper is not reachable.
  let last = Date.now()
  setInterval(() => {
    const now = Date.now()
    if (useNotifier.getState().state !== 'connected') {
      for (const { kind, alert: a } of alertsFor(useStore.getState().reminders, new Date(now), 1)) {
        if (a.fireAt > last && a.fireAt <= now) inAppNotify(a.title, a.body, a.urgent, alertTag(kind, a))
      }
      if (TOKEN && useNotifier.getState().state === 'offline') schedule() // helper may be back
    }
    last = now
  }, 30_000)
}
