import { useEffect } from 'react'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { useTick } from '../lib/hooks'
import { helperAnnouncesTimer, showSystemNotification, wants } from '../lib/notifier'
import { cycleNudgeAlert, timerAlert, type ScheduledAlert } from '../lib/reminders'
import { relayTimerEnd } from '../lib/relay'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'

export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function remainingMs(t: { endsAt: number | null; remainingMs: number; totalMs: number }, now: number): number {
  return t.endsAt ? Math.min(t.totalMs, Math.max(0, t.endsAt - now)) : t.remainingMs
}

/** Cycle alerts this page has announced, so a re-render or StrictMode never repeats one. */
const announced = new Set<string>()

/**
 * Mounted once at the app root, so a running timer finishes (and is saved) whichever
 * screen is open — and survives a reload, because the end time is persisted.
 */
export function TimerWatcher() {
  const t = useI18n()
  const { m } = t
  const timer = useStore((s) => s.timer)
  const now = useTick(500, !!timer?.endsAt)

  useEffect(() => {
    if (!timer) { document.title = m.focus.appName; return }
    const left = remainingMs(timer, now)
    const waiting = !!timer.cycleId && !!timer.endsAt && left <= 0
    document.title = t.f(m.focus.tabTitle, { icon: waiting ? '🔔' : timer.endsAt ? '▶' : '⏸', time: mmss(waiting ? now - timer.endsAt! : left), mode: timer.mode === 'focus' ? m.focus.state.focus : m.focus.state.break, app: m.focus.appName })
    // A cycle's step that ran out waits for the owner's answer (ADR-049): announced once, and
    // once more if no answer comes; the cycle prompt asks what next.
    if (timer.endsAt && left <= 0 && timer.cycleId) {
      const { cycle } = useStore.getState()
      const announce = (a: ScheduledAlert | null, sound: boolean) => {
        if (!a || announced.has(a.key) || now < a.fireAt) return
        announced.add(a.key)
        // Long past (the app was closed): the helper or the push said it already, or it is stale.
        if (now - a.fireAt > 60_000) return
        if (sound) celebrate.timerDone()
        if (!helperAnnouncesTimer() && wants('timer')) void showSystemNotification(a.title, a.body, { tag: 'itqan-timer' })
        if (!helperAnnouncesTimer() && sound) void relayTimerEnd(timer)
      }
      announce(timerAlert(timer, t, cycle), true)
      announce(cycleNudgeAlert(timer, cycle, t), false)
      return
    }
    if (timer.endsAt && left <= 0) {
      const { finishTimer, startTimer, settings, timer: live } = useStore.getState()
      // Already finished by an earlier run of this effect (StrictMode runs effects twice).
      if (!live || live.startedAt !== timer.startedAt) return
      const wasFocus = timer.mode === 'focus'
      const minutes = finishTimer(true)
      celebrate.timerDone()
      // The desktop helper has this timer's end on its schedule (ADR-013); the page notifies only without it.
      if (!helperAnnouncesTimer() && wants('timer')) void showSystemNotification(m.focus.appName, wasFocus ? t.f(m.focus.focusDoneNotify, { n: minutes }) : m.focus.breakOverNotify, { tag: 'itqan-timer' })
      // Without the helper, the other devices hear of it through the push relay, if this build has one (ADR-037).
      if (!helperAnnouncesTimer()) void relayTimerEnd(timer)
      if (wasFocus) {
        toast({
          emoji: '🎯', message: t.p(m.focus.focusLogged, minutes),
          action: { label: m.focus.startBreak, run: () => startTimer({ mode: 'break', totalMs: settings.breakMinutes * 60000, label: m.focus.breakLabel, areaId: null, goalId: null, taskId: null, habitId: null }) },
        }, 10000)
      } else {
        toast({ emoji: '☕', message: m.focus.breakFinished })
      }
    }
  }, [timer, now, t, m])

  return null
}
