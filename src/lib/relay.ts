import { tx } from '../i18n/core'
import { HAS_HELPER } from './notifier'
import { buildPushRequest, type PushMessage, type PushRequest } from './push'
import { thisDeviceId } from './pushDevice'
import { timerAlert } from './reminders'
import { useStore } from './store'
import type { ActiveTimer, PushTarget } from './types'

/**
 * Pushes from installs without the desktop helper (ADR-037): the hosted app in any browser — a
 * Windows laptop in Edge, say — hands its already signed and encrypted push to Itqan's push relay
 * (relay/worker.ts), because a web page may not POST to Apple's or Google's push service itself.
 *
 * Only the end of a focus session or break started here, sent the moment the page finishes it,
 * and the test button. Reminders and check-ins still need the helper, which sends them at their
 * time even with Itqan closed; a browser page can only act while it is open.
 */

const RELAY = ((import.meta.env.VITE_PUSH_RELAY as string | undefined) ?? '').replace(/\/+$/, '')

/** This install sends its pushes through the relay: the hosted app, built with the relay's address. */
export const HAS_RELAY = !HAS_HELPER && RELAY.startsWith('https://')

/** A timer's end announced more than this late (the laptop was asleep) is noise; the helper drops it too. */
const LATE_MS = 10 * 60_000
const SIGNATURE_MS = 20 * 60_000

async function post(push: PushRequest[]): Promise<boolean> {
  if (!HAS_RELAY || !push.length) return false
  try {
    const res = await fetch(`${RELAY}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ push }) })
    if (!res.ok) return false
    const { results } = (await res.json()) as { results: number[] }
    return results.some((s) => s >= 200 && s < 300)
  } catch {
    return false
  }
}

/** Every other registered device that wants timer endings — never this one: it shows its own. */
export function timerTargets(targets: PushTarget[], self: string | null): PushTarget[] {
  return targets.filter((t) => t.id !== self && t.kinds?.timer).slice(0, 10)
}

/** Called when the page finishes a timer that ran out: tells the other devices, through the relay. */
export async function relayTimerEnd(timer: ActiveTimer, now = Date.now()): Promise<void> {
  const a = timerAlert(timer)
  if (!HAS_RELAY || !a || now - a.fireAt > LATE_MS) return
  const targets = timerTargets(useStore.getState().pushTargets, thisDeviceId())
  const msg: PushMessage = { title: a.title, body: a.body, tag: 'itqan-timer' }
  const reqs = await Promise.all(targets.map((t) => buildPushRequest(t, msg, now + SIGNATURE_MS).catch(() => null)))
  await post(reqs.filter((r): r is PushRequest => !!r))
}

/** The test button next to a device, through the relay. */
export async function relayTestPush(t: PushTarget): Promise<boolean> {
  try {
    const req = await buildPushRequest(t, { title: '🔔 Itqan', body: tx().m.store.pushWorks, tag: 'itqan-test' }, Date.now() + SIGNATURE_MS)
    return await post([req])
  } catch {
    return false
  }
}
