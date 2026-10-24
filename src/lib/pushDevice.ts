import { uid } from './id'
import { HAS_HELPER } from './notifier'
import { generateVapidKeys, unb64url } from './push'
import { useStore } from './store'
import type { NotifySettings, PushKinds, PushTarget } from './types'

/**
 * This device's side of pushed alerts (ADR-031): a phone (or any browser with a service worker)
 * registers itself as a PushTarget, which sync carries to the laptop; the laptop's helper then
 * pushes it the end of every focus session or break started there, and reminders and check-ins
 * (ADR-033) — each kind only while this device's own choice for it is on.
 *
 * The id of this device's own registration is kept in localStorage (device-local), so the
 * synced list says which entry is "this phone".
 */

const DEVICE_KEY = 'itqan-push-device'

export type PushSupport = 'ok' | 'home-screen' | 'unsupported'

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** Whether this device can receive pushes: an iPhone only from the Home Screen app; never the file:// laptop app. */
export function pushSupport(): PushSupport {
  if (HAS_HELPER || location.protocol === 'file:' || !window.isSecureContext) return 'unsupported'
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  if (isIos() && !standalone) return 'home-screen'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

export function thisDeviceId(): string | null {
  try { return localStorage.getItem(DEVICE_KEY) } catch { return null }
}

function setThisDeviceId(id: string | null): void {
  try {
    if (id) localStorage.setItem(DEVICE_KEY, id)
    else localStorage.removeItem(DEVICE_KEY)
  } catch { /* private mode: the registration still works, it just isn't recognised as "this device" later */ }
}

export function deviceLabel(): string {
  const ua = navigator.userAgent
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/iPhone|iPod/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Browser'
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) throw new Error('no service worker')
  return navigator.serviceWorker.ready
}

/** The kinds this device wants pushed: its own choices, nothing when notifications are off here. */
export function kindsFrom(n: NotifySettings): PushKinds {
  return { timer: n.on && n.timer, reminders: n.on && n.reminders, checkIns: n.on && n.checkIns }
}

const anyKind = (k: PushKinds) => k.timer || k.reminders || k.checkIns
const sameKinds = (a: PushKinds | undefined, b: PushKinds) => !!a && a.timer === b.timer && a.reminders === b.reminders && a.checkIns === b.checkIns

/** Carries this device's choices to its registration, so the laptop pushes only what is wanted here. */
function syncKinds(): void {
  const { pushTargets, settings, savePushTarget } = useStore.getState()
  const target = pushTargets.find((t) => t.id === thisDeviceId())
  const kinds = kindsFrom(settings.notify)
  if (target && !sameKinds(target.kinds, kinds)) savePushTarget({ ...target, kinds, updatedAt: new Date().toISOString() })
}

function sameKey(a: ArrayBuffer | null | undefined, b: string): boolean {
  if (!a) return false
  const x = new Uint8Array(a)
  const y = unb64url(b)
  return x.length === y.length && x.every((v, i) => v === y[i])
}

/** Subscribes with this registration's VAPID key (replacing a subscription made with another) and saves the target. */
async function subscribe(base: Pick<PushTarget, 'id' | 'vapidPublic' | 'vapidPrivate' | 'createdAt' | 'kinds'>): Promise<void> {
  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (sub && !sameKey(sub.options.applicationServerKey, base.vapidPublic)) {
    await sub.unsubscribe()
    sub = null
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64url(base.vapidPublic) })
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('incomplete subscription')
  const now = new Date().toISOString()
  useStore.getState().savePushTarget({
    ...base,
    label: deviceLabel(),
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    subject: new URL(import.meta.env.BASE_URL, location.origin).href,
    updatedAt: now,
  })
  setThisDeviceId(base.id)
}

/**
 * Turns on "alerts from my laptop" for this device. Call straight from a tap: iOS only shows the
 * permission prompt for one. Asks the browser's permission once; after that it is remembered.
 * With notifications off here, or every kind off, turning this on turns them all on — asking for
 * alerts from the laptop and then receiving none would make no sense.
 */
export async function enablePush(): Promise<'ok' | 'denied' | 'failed'> {
  try {
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (perm !== 'granted') return 'denied'
    const { settings, updateSettings } = useStore.getState()
    let kinds = kindsFrom(settings.notify)
    if (!anyKind(kinds)) {
      kinds = { timer: true, reminders: true, checkIns: true }
      updateSettings({ notify: { on: true, ...kinds } })
    }
    const id = thisDeviceId()
    const existing = useStore.getState().pushTargets.find((t) => t.id === id)
    const keys = existing ? { publicKey: existing.vapidPublic, privateKey: existing.vapidPrivate } : await generateVapidKeys()
    await subscribe({ id: existing?.id ?? uid(), vapidPublic: keys.publicKey, vapidPrivate: keys.privateKey, createdAt: existing?.createdAt ?? new Date().toISOString(), kinds })
    return 'ok'
  } catch {
    return 'failed'
  }
}

/** Turns it off: unsubscribes and removes this device from the synced list, so the laptop stops sending. */
export async function disablePush(): Promise<void> {
  const id = thisDeviceId()
  if (id) useStore.getState().removePushTarget(id)
  setThisDeviceId(null)
  try { await (await (await registration()).pushManager.getSubscription())?.unsubscribe() } catch { /* already gone */ }
}

/**
 * Changes this device's notification choices (ADR-033). Pushes from the laptop follow them: a kind
 * turned off here is no longer pushed here; turning off all notifications, or every kind, stops
 * pushes altogether.
 */
export function setNotify(patch: Partial<NotifySettings>): void {
  const { settings, updateSettings } = useStore.getState()
  const next = { ...settings.notify, ...patch }
  updateSettings({ notify: next })
  if (!thisDeviceId()) return
  if (!anyKind(kindsFrom(next))) void disablePush()
  else syncKinds()
}

/**
 * On start: keeps this device's registration true. Removed on another device, or permission
 * withdrawn in the phone's settings → let go of the subscription. Subscription renewed by the
 * browser (new endpoint) → update the synced entry so the laptop sends to the new one.
 */
export async function refreshPush(): Promise<void> {
  const id = thisDeviceId()
  if (!id || pushSupport() !== 'ok') return
  const target = useStore.getState().pushTargets.find((t) => t.id === id)
  if (!target || Notification.permission !== 'granted') return void disablePush()
  syncKinds() // a registration from before ADR-033 was given every kind; narrow it to this device's choices
  try {
    const sub = await (await registration()).pushManager.getSubscription()
    if (sub?.endpoint !== target.endpoint) await subscribe(target)
  } catch { /* offline or no worker yet: try again next start */ }
}
