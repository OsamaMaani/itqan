import { describe, expect, it } from 'vitest'
import { RELEASES, type Release } from '../../content/releases'
import { UI_LANGUAGES } from '../types'
import { MAX_ANNOUNCED, toAnnounce } from '../releases'
import statusJson from '../../../memory/status.json?raw'

/**
 * What's new (ADR-040). The owner asked for every update to be announced in the app, so this is
 * enforced like the dashboard: a task marked done in status.json without a release entry fails CI.
 */

/**
 * The first task number announced in each stage: everything before it shipped before What's new
 * existed (2026-10-27). A stage not listed — one begun later — is announced from its first task.
 */
const ANNOUNCED_FROM: Record<number, number> = { 0: Infinity, 1: Infinity, 2: 43, 4: 6 }

function needsAnnouncing(id: string): boolean {
  const m = /^S(\d+)-(\d+)$/.exec(id)
  if (!m) return false
  return Number(m[2]) >= (ANNOUNCED_FROM[Number(m[1])] ?? 0)
}

const status = JSON.parse(statusJson) as {
  stages: { tasks: { id: string; status: string }[] }[]
}

describe('release notes', () => {
  it('every task done since What’s new began is announced', () => {
    const announced = new Set(RELEASES.flatMap((r) => r.tasks))
    const missing = status.stages.flatMap((s) => s.tasks)
      .filter((t) => t.status === 'done' && needsAnnouncing(t.id))
      .map((t) => t.id)
      .filter((id) => !announced.has(id))
    expect(missing, 'add these tasks to src/content/releases.ts').toEqual([])
  })

  it('ids go up by one, newest first, with valid dates that never go backwards', () => {
    RELEASES.forEach((r, i) => {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      if (i > 0) {
        expect(r.id).toBe(RELEASES[i - 1].id - 1)
        expect(r.date <= RELEASES[i - 1].date).toBe(true)
      }
    })
    expect(RELEASES.at(-1)?.id).toBe(1)
  })

  it('every item is written in all five languages', () => {
    for (const r of RELEASES) {
      for (const it of r.items) {
        expect(it.emoji.trim()).not.toBe('')
        for (const l of UI_LANGUAGES) expect(it.text[l]?.trim(), `release ${r.id}, ${l}`).toBeTruthy()
      }
    }
  })

  it('knows which tasks need announcing', () => {
    expect(['S2-42', 'S2-43', 'S3-01', 'S4-05', 'S4-06', 'S5-01', 'S1-99', 'X'].map(needsAnnouncing)).toEqual([false, true, true, false, true, true, false, false])
  })

  it('a task is announced once', () => {
    const all = RELEASES.flatMap((r) => r.tasks)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('toAnnounce', () => {
  const rel = (id: number, date: string, items = 1): Release => ({
    id, date, tasks: [], items: Array.from({ length: items }, () => ({ emoji: '✨', text: { en: 'x', ar: 'x', fr: 'x', zh: 'x', es: 'x' } })),
  })
  const list = [rel(5, '2026-10-27'), rel(4, '2026-10-25', 0), rel(3, '2026-10-24'), rel(2, '2026-10-10'), rel(1, '2026-09-01')]

  it('shows what is newer than the last one seen, newest first, skipping empty ones', () => {
    expect(toAnnounce(list, 2, '2026-10-27').map((r) => r.id)).toEqual([5, 3])
    expect(toAnnounce(list, 5, '2026-10-27')).toEqual([])
  })

  it('a device that never saw any gets the past week’s', () => {
    expect(toAnnounce(list, null, '2026-10-27').map((r) => r.id)).toEqual([5, 3])
    expect(toAnnounce(list, null, '2026-12-01')).toEqual([])
  })

  it('at most MAX_ANNOUNCED at once', () => {
    expect(toAnnounce(list, 0, '2026-10-27')).toHaveLength(MAX_ANNOUNCED)
  })
})
