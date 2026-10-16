import { create } from 'zustand'
import { checkIn } from './connections'
import { toKey } from './date'
import { at, buildSchedule, type ScheduledAlert } from './reminders'
import { useStore } from './store'
import { toast } from './toast'
import type { Reminder } from './types'

/**
 * Keeps the desktop helper (scripts/itqan_reminders.py) in sync with the reminders, so alerts
 * arrive even when Itqan is closed (ADR-013). The token is baked into the local build by
 * scripts/install_local.sh; builds without it (dev, GitHub Pages) fall back to in-app alerts
 * while the app is open.
 */

const URL = 'http://127.0.0.1:47321'
const TOKEN = (import.meta.env.VITE_ITQAN_HELPER_TOKEN as string | undefined) ?? ''

export type HelperState = 'checking' | 'connected' | 'offline' | 'unauthorized' | 'unavailable'

export const useNotifier = create<{ state: HelperState; next: number | null; pending: number }>(() => ({
  state: TOKEN ? 'checking' : 'unavailable',
  next: null,
  pending: 0,
}))

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
    out.push({ key: `checkin|${c.id}|${ci.due}`, fireAt, title: `🫶 Check in with ${c.name}`, body: 'It has been a while — a quick message is enough.', urgent: false })
  }
  return out
}

export async function syncReminders(reminders: Reminder[]): Promise<void> {
  if (!TOKEN) return
  try {
    const items = [...buildSchedule(reminders, new Date()), ...checkInAlerts(new Date())]
    const res = await call('/schedule', { method: 'PUT', body: JSON.stringify({ items }) })
    if (res.status === 401) return void useNotifier.setState({ state: 'unauthorized' })
    if (!res.ok) throw new Error(String(res.status))
    const h = await (await call('/health')).json()
    useNotifier.setState({ state: 'connected', next: h.next ?? null, pending: h.pending ?? 0 })
  } catch {
    useNotifier.setState({ state: 'offline' })
  }
}

export async function sendTestNotification(): Promise<boolean> {
  if (useNotifier.getState().state === 'connected') {
    try { return (await call('/test', { method: 'POST', body: '{}' })).ok } catch { return false }
  }
  return inAppNotify('Itqan', 'Notifications are working ✓', false)
}

function inAppNotify(title: string, body: string, urgent: boolean): boolean {
  toast({ emoji: '🔔', message: `${title} — ${body.split('\n')[0]}` }, urgent ? 20000 : 8000)
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, requireInteraction: urgent })
      return true
    }
  } catch { /* optional */ }
  return false
}

let started = false

/** Called once from App. Syncs on load, on every reminder change, and hourly (rolls the horizon). */
export function startNotifier(): void {
  if (started) return
  started = true

  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => syncReminders(useStore.getState().reminders), 400)
  }
  schedule()
  useStore.subscribe((s, prev) => { if (s.reminders !== prev.reminders || s.contacts !== prev.contacts || s.interactions !== prev.interactions) schedule() })
  setInterval(schedule, 60 * 60 * 1000)

  // Fallback while the app is open and the helper is not reachable.
  let last = Date.now()
  setInterval(() => {
    const now = Date.now()
    if (useNotifier.getState().state !== 'connected') {
      for (const a of [...buildSchedule(useStore.getState().reminders, new Date(now), 1), ...checkInAlerts(new Date(now))]) {
        if (a.fireAt > last && a.fireAt <= now) inAppNotify(a.title, a.body, a.urgent)
      }
      if (TOKEN && useNotifier.getState().state === 'offline') schedule() // helper may be back
    }
    last = now
  }, 30_000)
}
