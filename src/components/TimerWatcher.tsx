import { useEffect } from 'react'
import { celebrate } from '../lib/celebrate'
import { useTick } from '../lib/hooks'
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
  const timer = useStore((s) => s.timer)
  const now = useTick(500, !!timer?.endsAt)

  useEffect(() => {
    if (!timer) { document.title = 'Itqan'; return }
    const left = remainingMs(timer, now)
    document.title = `${timer.endsAt ? '▶' : '⏸'} ${mmss(left)} · ${timer.mode === 'focus' ? 'Focus' : 'Break'} — Itqan`
    if (timer.endsAt && left <= 0) {
      const { finishTimer, startTimer, settings, timer: live } = useStore.getState()
      // Already finished by an earlier run of this effect (StrictMode runs effects twice).
      if (!live || live.startedAt !== timer.startedAt) return
      const wasFocus = timer.mode === 'focus'
      const minutes = finishTimer(true)
      celebrate.timerDone()
      notify(wasFocus ? `Focus done — ${minutes} min. Take a break.` : 'Break over. Ready for the next one?')
      if (wasFocus) {
        toast({
          emoji: '🎯', message: `${minutes} minutes of focus logged`,
          action: { label: 'Start break', run: () => startTimer({ mode: 'break', totalMs: settings.breakMinutes * 60000, label: 'Break', areaId: null, goalId: null, taskId: null }) },
        }, 10000)
      } else {
        toast({ emoji: '☕', message: 'Break finished' })
      }
    }
  }, [timer, now])

  return null
}

function notify(body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Itqan', { body, icon: 'icon-192.png' })
  } catch {
    /* notifications are optional */
  }
}
