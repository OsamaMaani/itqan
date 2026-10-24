import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { kindsFrom, setNotify } from '../pushDevice'
import { emptyData } from '../seed'
import { useStore } from '../store'
import type { PushTarget } from '../types'

// This device's registration id lives in localStorage, which Node has none of.
let local: Record<string, string> = {}

const target = (id: string): PushTarget => ({
  id, label: 'iPhone', endpoint: `https://web.push.apple.com/${id}`, p256dh: 'k', auth: 'a', vapidPublic: 'v', vapidPrivate: {},
  subject: 's', kinds: { timer: true, reminders: true, checkIns: true }, createdAt: '', updatedAt: '',
})
const mine = () => useStore.getState().pushTargets.find((t) => t.id === 'me')

beforeEach(() => {
  local = { 'itqan-push-device': 'me' }
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local[k] ?? null,
    setItem: (k: string, v: string) => { local[k] = v },
    removeItem: (k: string) => { delete local[k] },
  })
  useStore.setState({ ...emptyData(), pushTargets: [target('me'), target('other')] })
})
afterEach(() => vi.unstubAllGlobals())

describe("this device's choices travel with its registration (ADR-033)", () => {
  it('a kind turned off here is no longer wanted pushed here; the others stay', () => {
    setNotify({ reminders: false })
    expect(mine()?.kinds).toEqual({ timer: true, reminders: false, checkIns: true })
    expect(mine()?.updatedAt).not.toBe('') // so sync carries the change to the laptop
    expect(useStore.getState().pushTargets.find((t) => t.id === 'other')?.kinds.reminders).toBe(true)
  })

  it('turning the timer off no longer stops reminders and check-ins from arriving', () => {
    setNotify({ timer: false })
    expect(mine()?.kinds).toEqual({ timer: false, reminders: true, checkIns: true })
  })

  it('every kind off, or notifications off, removes the registration', () => {
    setNotify({ timer: false, reminders: false })
    expect(mine()).toBeDefined()
    setNotify({ checkIns: false })
    expect(mine()).toBeUndefined()
    expect(local['itqan-push-device']).toBeUndefined()

    local['itqan-push-device'] = 'me'
    useStore.setState({ pushTargets: [target('me')], settings: { ...useStore.getState().settings, notify: { on: true, timer: true, reminders: true, checkIns: true } } })
    setNotify({ on: false })
    expect(mine()).toBeUndefined()
  })

  it('an unchanged choice does not rewrite the registration', () => {
    const before = mine()
    setNotify({ reminders: true })
    expect(mine()).toBe(before)
  })

  it('a device not registered changes only its own settings', () => {
    delete local['itqan-push-device']
    setNotify({ reminders: false })
    expect(useStore.getState().pushTargets.map((t) => t.kinds.reminders)).toEqual([true, true])
    expect(useStore.getState().settings.notify.reminders).toBe(false)
  })

  it('with notifications off, nothing is wanted', () => {
    expect(kindsFrom({ on: false, timer: true, reminders: true, checkIns: true })).toEqual({ timer: false, reminders: false, checkIns: false })
  })
})
