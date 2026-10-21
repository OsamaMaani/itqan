import { beforeEach, describe, expect, it } from 'vitest'
import { countsMinutes, focusHabitAmount } from '../habits'
import { emptyData } from '../seed'
import { useStore } from '../store'
import type { ActiveTimer } from '../types'

const st = () => useStore.getState()

beforeEach(() => {
  useStore.setState({ ...emptyData() })
})

// 23:50 local on 20 October: the habit must land on the 20th wherever this runs, never on UTC's day.
const LATE = new Date(2026, 9, 20, 23, 50).toISOString()
const DAY = '2026-10-20'

/** A focus timer that ran its full length and has just ended. */
function endedTimer(minutes: number, habitId: string | null): ActiveTimer {
  return {
    mode: 'focus', endsAt: Date.now() - 1, remainingMs: 0, totalMs: minutes * 60000, startedAt: LATE,
    label: 'Session', areaId: null, goalId: null, taskId: null, habitId,
  }
}

const addHabit = (unit: string, target: number) =>
  st().addHabit({ name: 'H', emoji: '', areaId: null, schedule: { type: 'daily' }, target, unit })

describe('minute units', () => {
  it('recognises minutes in every interface language, ignoring case, spaces and a trailing dot', () => {
    for (const unit of ['min', 'Min.', ' minutes ', 'mn', 'minutos', 'دقيقة', 'دقائق', '分钟']) expect(countsMinutes({ unit })).toBe(true)
  })
  it('anything else is not minutes — including m, which may be metres', () => {
    for (const unit of ['', 'pages', 'm', 'h', 'glasses', 'صفحة']) expect(countsMinutes({ unit })).toBe(false)
  })
  it('a session adds its minutes to a minutes habit and one check-in to any other', () => {
    expect(focusHabitAmount({ unit: 'min' }, 25)).toBe(25)
    expect(focusHabitAmount({ unit: 'pages' }, 25)).toBe(1)
    expect(focusHabitAmount({ unit: '' }, 25)).toBe(1)
  })
})

describe('a focus session for a habit', () => {
  it('finishing adds its minutes to a minutes habit on the day it started; deleting takes exactly that back', () => {
    const hid = addHabit('min', 30)
    st().setHabitAmount(hid, DAY, 5) // logged by hand earlier
    useStore.setState({ timer: endedTimer(20, hid) })
    expect(st().finishTimer(true)).toBe(20)
    expect(st().habitLogs[hid][DAY]).toBe(25)
    expect(st().focusSessions[0]).toMatchObject({ habitId: hid, habitAmount: 20, minutes: 20 })

    st().deleteFocusSession(st().focusSessions[0].id)
    expect(st().focusSessions).toEqual([])
    expect(st().habitLogs[hid][DAY]).toBe(5) // the hand-logged minutes stay
  })
  it('checks in a habit not counted in minutes once', () => {
    const hid = addHabit('', 1)
    useStore.setState({ timer: endedTimer(25, hid) })
    st().finishTimer(true)
    expect(st().habitLogs[hid][DAY]).toBe(1)
    expect(st().focusSessions[0].habitAmount).toBe(1)
  })
  it('deleting never takes the habit below zero, if it was unchecked by hand meanwhile', () => {
    const hid = addHabit('min', 30)
    useStore.setState({ timer: endedTimer(20, hid) })
    st().finishTimer(true)
    st().setHabitAmount(hid, DAY, 10)
    st().deleteFocusSession(st().focusSessions[0].id)
    expect(st().habitLogs[hid][DAY]).toBeUndefined()
  })
  it('a discarded session or a break adds nothing to the habit', () => {
    const hid = addHabit('min', 30)
    useStore.setState({ timer: endedTimer(20, hid) })
    st().finishTimer(false)
    useStore.setState({ timer: { ...endedTimer(5, hid), mode: 'break' } })
    st().finishTimer(true)
    expect(st().habitLogs[hid]?.[DAY]).toBeUndefined()
    expect(st().focusSessions).toEqual([])
  })
  it('a session without a habit touches no habit', () => {
    const hid = addHabit('min', 30)
    useStore.setState({ timer: endedTimer(20, null) })
    st().finishTimer(true)
    expect(st().habitLogs[hid]?.[DAY]).toBeUndefined()
    expect(st().focusSessions[0]).toMatchObject({ habitId: null, habitAmount: 0 })
  })
  it('a habit deleted while its timer runs: the session is kept, linked to nothing', () => {
    const hid = addHabit('min', 30)
    useStore.setState({ timer: endedTimer(20, hid) })
    st().deleteHabit(hid)
    expect(st().timer!.habitId).toBeNull()
    st().finishTimer(true)
    expect(st().focusSessions[0]).toMatchObject({ habitId: null, habitAmount: 0, minutes: 20 })
    expect(st().habitLogs[hid]).toBeUndefined()
  })
  it('deleting a habit unlinks its past sessions and keeps their minutes', () => {
    const hid = addHabit('min', 30)
    useStore.setState({ timer: endedTimer(20, hid) })
    st().finishTimer(true)
    st().deleteHabit(hid)
    expect(st().focusSessions[0]).toMatchObject({ habitId: null, habitAmount: 0, minutes: 20 })
  })
})
