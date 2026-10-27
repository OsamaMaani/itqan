import { beforeEach, describe, expect, it } from 'vitest'
import { todayKey } from '../date'
import { dayStreak, xpEvents } from '../gamification'
import { streak } from '../habits'
import { emptyData } from '../seed'
import { snapshot, useStore } from '../store'

/**
 * A report from a first-day user (2026-10-27): tick a new habit on Today, untick it, tick it
 * again — the streak read 2. Ticking, unticking and re-ticking the same day must leave exactly
 * one met day, whatever the order, in both the habit's streak and the day streak.
 */

const st = () => useStore.getState()

beforeEach(() => {
  useStore.setState({ ...emptyData() })
})

describe('re-ticking a habit on the same day', () => {
  it('a new habit ticked, unticked and ticked again has a one-day streak', () => {
    const today = todayKey()
    const id = st().addHabit({ name: 'Read', emoji: '', areaId: null, schedule: { type: 'daily' }, target: 1, unit: '' })
    st().setHabitAmount(id, today, 1)
    st().setHabitAmount(id, today, 0)
    st().setHabitAmount(id, today, 1)
    const h = st().habits.find((x) => x.id === id)!
    expect(st().habitLogs[id]).toEqual({ [today]: 1 })
    expect(streak(h, st().habitLogs, today, 6).current).toBe(1)
    const day = dayStreak(xpEvents(snapshot(st())), today)
    expect(day.current).toBe(1)
    expect(day.best).toBe(1)
  })

  it('a counted habit stepped up, down and up again still counts one day', () => {
    const today = todayKey()
    const id = st().addHabit({ name: 'Quran', emoji: '', areaId: null, schedule: { type: 'daily' }, target: 4, unit: 'pages' })
    for (const n of [4, 0, 2, 4, 0, 4]) st().setHabitAmount(id, today, n)
    const h = st().habits.find((x) => x.id === id)!
    expect(streak(h, st().habitLogs, today, 6).current).toBe(1)
    expect(dayStreak(xpEvents(snapshot(st())), today).current).toBe(1)
  })
})
