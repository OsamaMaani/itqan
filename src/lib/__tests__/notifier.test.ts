import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduledAlert } from '../reminders'
import { emptyData } from '../seed'
import { useStore } from '../store'

// The helper token is read when notifier.ts loads, so it is stubbed before a fresh import.
let puts: ScheduledAlert[][] = []

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
