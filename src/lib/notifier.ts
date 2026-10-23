import { tx } from '../i18n/core'
import { create } from 'zustand'
import { checkIn } from './connections'
import { toKey } from './date'
import { buildPushRequest, type PushRequest } from './push'
import { at, buildSchedule, timerAlert, type ScheduledAlert } from './reminders'
import { useStore } from './store'
import { toast } from './toast'
import type { NotifySettings, PushTarget, Reminder } from './types'

/**
 * Keeps the desktop helper (scripts/itqan_reminders.py) in sync with the reminders, so alerts
 * arrive even when Itqan is closed (ADR-013). The token is baked into the local build by
 * scripts/install_local.sh; builds without it (dev, GitHub Pages) fall back to in-app alerts
 * while the app is open.
 *
 * What is announced follows Settings → Notifications (ADR-031): the device's own choices, and —
 * for a timer — every device registered for pushes, whose push the helper sends at the same time.
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
export type HelperItem = ScheduledAlert & { desktop?: boolean; push?: PushRequest[] }

/**
 * A push is valid until shortly after its alert (the helper drops one sent later anyway), and is
 * built once per alert and device — encryption is fresh each time, so rebuilding on every sync
 * would only cost time.
 */
const PUSH_VALID_MS = 30 * 60_000
const pushCache = new Map<string, Promise<PushRequest | null>>()

function pushFor(t: PushTarget, a: ScheduledAlert): Promise<PushRequest | null> {
  const k = `${a.key}|${t.id}|${t.endpoint}`
  let p = pushCache.get(k)
  if (!p) {
    p = buildPushRequest(t, { title: a.title, body: a.body, tag: 'itqan-timer' }, a.fireAt + PUSH_VALID_MS).catch(() => null)
    pushCache.set(k, p)
  }
  return p
}

/** Timer alerts as the helper should fire them, with this device's choice and the registered devices. */
async function timerItems(now: number): Promise<HelperItem[]> {
  const desktop = wants('timer')
  const targets = useStore.getState().pushTargets
  const alerts = timerAlerts(now)
  const live = new Set(alerts.map((a) => a.key))
  for (const k of pushCache.keys()) if (!live.has(k.split('|').slice(0, 3).join('|'))) pushCache.delete(k)
  const out: HelperItem[] = []
  for (const a of alerts) {
    const push = (await Promise.all(targets.map((t) => pushFor(t, a)))).filter((p): p is PushRequest => !!p)
    if (desktop || push.length) out.push({ ...a, desktop, push })
  }
  return out
}

/** Reminder and check-in alerts this device announces (ADR-031). */
function alertsFor(reminders: Reminder[], now: Date, horizonDays?: number): ScheduledAlert[] {
  return [
    ...(wants('reminders') ? buildSchedule(reminders, now, horizonDays) : []),
    ...(wants('checkIns') ? checkInAlerts(now) : []),
  ]
}

/** True when the helper is announcing the timer's end, so the page should not do it as well. */
export function helperAnnouncesTimer(): boolean {
  const s = useNotifier.getState().state
  return s === 'connected' || s === 'checking'
}

export async function syncReminders(reminders: Reminder[]): Promise<void> {
  if (!TOKEN) return
  try {
    const items: HelperItem[] = [...alertsFor(reminders, new Date()), ...(await timerItems(Date.now()))]
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
    const req = await buildPushRequest(t, { title: '🔔 Itqan', body: tx().m.store.pushWorks, tag: 'itqan-test' }, Date.now() + PUSH_VALID_MS)
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

function inAppNotify(title: string, body: string, urgent: boolean): void {
  toast({ emoji: '🔔', message: `${title} — ${body.split('\n')[0]}` }, urgent ? 20000 : 8000)
  void showSystemNotification(title, body, { urgent })
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
      for (const a of alertsFor(useStore.getState().reminders, new Date(now), 1)) {
        if (a.fireAt > last && a.fireAt <= now) inAppNotify(a.title, a.body, a.urgent)
      }
      if (TOKEN && useNotifier.getState().state === 'offline') schedule() // helper may be back
    }
    last = now
  }, 30_000)
}
