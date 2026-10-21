import { useEffect } from 'react'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { useTick } from '../lib/hooks'
import { helperAnnouncesTimer } from '../lib/notifier'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'

export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function remainingMs(t: { endsAt: number | null; remainingMs: number; totalMs: number }, now: number): number {
  return t.endsAt ? Math.min(t.totalMs, Math.max(0, t.endsAt - now)) : t.remainingMs
}

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
    document.title = t.f(m.focus.tabTitle, { icon: timer.endsAt ? '▶' : '⏸', time: mmss(left), mode: timer.mode === 'focus' ? m.focus.state.focus : m.focus.state.break, app: m.focus.appName })
    if (timer.endsAt && left <= 0) {
      const { finishTimer, startTimer, settings, timer: live } = useStore.getState()
      // Already finished by an earlier run of this effect (StrictMode runs effects twice).
      if (!live || live.startedAt !== timer.startedAt) return
      const wasFocus = timer.mode === 'focus'
      const minutes = finishTimer(true)
      celebrate.timerDone()
      // The desktop helper has this timer's end on its schedule (ADR-013); the page notifies only without it.
      if (!helperAnnouncesTimer()) notify(wasFocus ? t.f(m.focus.focusDoneNotify, { n: minutes }) : m.focus.breakOverNotify, m.focus.appName)
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

function notify(body: string, title: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: 'icon-192.png' })
  } catch {
    /* notifications are optional */
  }
}
