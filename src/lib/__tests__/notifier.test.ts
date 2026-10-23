import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HelperItem } from '../notifier'
import { b64url, generateVapidKeys } from '../push'
import { toKey } from '../date'
import { emptyData } from '../seed'
import { useStore } from '../store'

// The helper token is read when notifier.ts loads, so it is stubbed before a fresh import.
let puts: HelperItem[][] = []

async function load() {
  vi.resetModules()
  vi.stubEnv('VITE_ITQAN_HELPER_TOKEN', 'test-token')
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/schedule')) puts.push(JSON.parse(String(init?.body)).items)
    return new Response(JSON.stringify({ ok: true, pending: 0, next: null }), { status: 200 })
  }))
  const store = await import('../store')
  const notifier = await import('../notifier')
  return { store: store.useStore, notifier }
}

const timerKeys = () => (puts.at(-1) ?? []).filter((a) => a.key.startsWith('timer|')).map((a) => a.key)

beforeEach(() => {
  puts = []
  vi.useFakeTimers()
  useStore.setState({ ...emptyData() })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('focus timer on the desktop helper', () => {
  it('a started timer is sent to the helper; pausing removes it', async () => {
    const { store, notifier } = await load()
    store.setState({ ...emptyData() })
    notifier.startNotifier()
    store.getState().startTimer({ mode: 'focus', totalMs: 25 * 60000, label: 'Read', areaId: null, goalId: null, taskId: null, habitId: null })
    await vi.advanceTimersByTimeAsync(500)
    expect(timerKeys()).toHaveLength(1)
    store.getState().pauseTimer()
    await vi.advanceTimersByTimeAsync(500)
    expect(timerKeys()).toEqual([])
  })

  it('a timer that ran out stays on the schedule after the app finishes it, so the helper still fires it', async () => {
    const { store, notifier } = await load()
    store.setState({ ...emptyData() })
    notifier.startNotifier()
    store.getState().startTimer({ mode: 'focus', totalMs: 60000, label: 'Read', areaId: null, goalId: null, taskId: null, habitId: null })
    await vi.advanceTimersByTimeAsync(500)
    const [key] = timerKeys()
    await vi.advanceTimersByTimeAsync(60000)
    store.getState().finishTimer(true) // what TimerWatcher does the moment it ends
    await vi.advanceTimersByTimeAsync(500)
    expect(timerKeys()).toEqual([key])
  })

  it('a timer stopped early is dropped at once', async () => {
    const { store, notifier } = await load()
    store.setState({ ...emptyData() })
    notifier.startNotifier()
    store.getState().startTimer({ mode: 'focus', totalMs: 25 * 60000, label: 'Read', areaId: null, goalId: null, taskId: null, habitId: null })
    await vi.advanceTimersByTimeAsync(500)
    store.getState().finishTimer(true)
    await vi.advanceTimersByTimeAsync(500)
    expect(timerKeys()).toEqual([])
  })
})

async function phone() {
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const v = await generateVapidKeys()
  return {
    id: 'phone', label: 'iPhone', endpoint: 'https://web.push.apple.com/abc', subject: 'https://example.github.io/itqan/',
    p256dh: b64url(new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey))), auth: b64url(crypto.getRandomValues(new Uint8Array(16))),
    vapidPublic: v.publicKey, vapidPrivate: v.privateKey, createdAt: '', updatedAt: '',
  }
}

const startFocus = (store: Awaited<ReturnType<typeof load>>['store']) =>
  store.getState().startTimer({ mode: 'focus', totalMs: 25 * 60000, label: 'Read', areaId: null, goalId: null, taskId: null, habitId: null })
const lastTimer = () => (puts.at(-1) ?? []).find((a) => a.key.startsWith('timer|'))
/** Building a push runs real WebCrypto, which fake timers do not advance — wait for the PUT itself. */
const settle = () => vi.waitFor(() => expect(puts.length).toBeGreaterThan(0), { timeout: 3000 })

describe('notification choices and pushes (ADR-031)', () => {
  it('a registered phone gets the timer end pushed, alongside the desktop alert', async () => {
    const { store, notifier } = await load()
    store.setState({ ...emptyData(), pushTargets: [await phone()] })
    notifier.startNotifier()
    startFocus(store)
    await vi.advanceTimersByTimeAsync(500)
    await settle()
    const item = lastTimer()!
    expect(item.desktop).toBe(true)
    expect(item.push).toHaveLength(1)
    expect(item.push![0].endpoint).toBe('https://web.push.apple.com/abc')
    expect(item.push![0].headers['Content-Encoding']).toBe('aes128gcm')
  })

  it('with timer alerts off here, the phone still gets its push but the desktop stays quiet', async () => {
    const { store, notifier } = await load()
    const s = emptyData()
    store.setState({ ...s, pushTargets: [await phone()], settings: { ...s.settings, notify: { ...s.settings.notify, timer: false } } })
    notifier.startNotifier()
    startFocus(store)
    await vi.advanceTimersByTimeAsync(500)
    await settle()
    expect(lastTimer()).toMatchObject({ desktop: false })
    expect(lastTimer()!.push).toHaveLength(1)
  })

  it('with timer alerts off and no phone, nothing about the timer is sent', async () => {
    const { store, notifier } = await load()
    const s = emptyData()
    store.setState({ ...s, settings: { ...s.settings, notify: { ...s.settings.notify, on: false } } })
    notifier.startNotifier()
    startFocus(store)
    await vi.advanceTimersByTimeAsync(500)
    expect(puts.length).toBeGreaterThan(0)
    expect(lastTimer()).toBeUndefined()
  })

  it('reminders are scheduled only while reminder alerts are on', async () => {
    const { store, notifier } = await load()
    store.setState({ ...emptyData() })
    notifier.startNotifier()
    store.getState().addReminder({ title: 'Call', notes: '', emoji: '📞', date: toKey(new Date(Date.now() + 10 * 86400_000)), time: '10:00', repeat: 'none', alerts: [0], important: false })
    await vi.advanceTimersByTimeAsync(500)
    expect((puts.at(-1) ?? []).some((a) => a.key.includes('|'))).toBe(true)
    store.getState().updateSettings({ notify: { ...store.getState().settings.notify, reminders: false } })
    await vi.advanceTimersByTimeAsync(500)
    expect(puts.at(-1)).toEqual([])
  })
})
