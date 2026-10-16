import { motion } from 'motion/react'
import { BarChart3, Bell, BookOpenCheck, CalendarDays, Camera, FolderKanban, Lightbulb, Menu, Plus, Settings, Sun, Target, Timer, Repeat, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useProgress } from '../lib/hooks'
import { navigate, type Route } from '../lib/router'
import { useStore } from '../lib/store'
import { mmss, remainingMs } from './TimerWatcher'
import { useTick } from '../lib/hooks'
import { cx, Modal, ProgressBar } from './ui'
import { SyncBadge } from './SyncPanel'

export const NAV: { route: Route; label: string; icon: ReactNode }[] = [
  { route: 'today', label: 'Today', icon: <Sun size={18} /> },
  { route: 'plan', label: 'Plan', icon: <CalendarDays size={18} /> },
  { route: 'habits', label: 'Habits', icon: <Repeat size={18} /> },
  { route: 'goals', label: 'Goals', icon: <Target size={18} /> },
  { route: 'projects', label: 'Projects', icon: <FolderKanban size={18} /> },
  { route: 'focus', label: 'Focus', icon: <Timer size={18} /> },
  { route: 'ideas', label: 'Ideas', icon: <Lightbulb size={18} /> },
  { route: 'reminders', label: 'Reminders', icon: <Bell size={18} /> },
  { route: 'connections', label: 'Connections', icon: <Users size={18} /> },
  { route: 'memories', label: 'Memories', icon: <Camera size={18} /> },
  { route: 'insights', label: 'Insights', icon: <BarChart3 size={18} /> },
  { route: 'review', label: 'Review', icon: <BookOpenCheck size={18} /> },
  { route: 'settings', label: 'Settings', icon: <Settings size={18} /> },
]

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 512 512" className="size-9">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#0d9488" /></linearGradient></defs>
        <rect width="512" height="512" rx="120" fill="#0b1210" />
        <circle cx="256" cy="256" r="150" fill="none" stroke="#1f2d29" strokeWidth="44" />
        <path d="M256 106 A150 150 0 1 1 120 320" fill="none" stroke="url(#lg)" strokeWidth="44" strokeLinecap="round" />
        <path d="M196 258 l42 42 l82 -92" fill="none" stroke="#ecfdf5" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="leading-none">
        <div className="text-lg font-extrabold tracking-tight">Itqan</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">إتقان</div>
      </div>
    </div>
  )
}

function TimerBadge() {
  const timer = useStore((s) => s.timer)
  const now = useTick(1000, !!timer?.endsAt)
  if (!timer) return null
  return (
    <span className={cx('ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular', timer.mode === 'break' ? 'bg-sky-500/15 text-sky-500' : 'bg-accent-soft text-accent')}>
      {mmss(remainingMs(timer, now))}
    </span>
  )
}

export function Sidebar({ route, onAdd }: { route: Route; onAdd: () => void }) {
  const { level, total } = useProgress()
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface/50 p-4 backdrop-blur-xl lg:flex">
      <div className="px-2 py-2"><Logo /></div>
      <button onClick={onAdd} className="mt-5 flex h-11 items-center gap-2 rounded-xl bg-gradient-accent px-4 text-sm font-bold text-accent-fg shadow-[0_8px_24px_-8px_var(--accent)] transition hover:brightness-110 active:scale-[0.98]">
        <Plus size={18} /> New task
        <span className="ml-auto rounded-md bg-black/10 px-1.5 py-0.5 text-[10px]">Ctrl K</span>
      </button>
      <nav className="mt-4 flex min-h-0 flex-col gap-0.5 overflow-y-auto">
        {NAV.map((n, i) => {
          const on = route === n.route
          return (
            <button
              key={n.route}
              onClick={() => navigate(n.route)}
              className={cx('relative flex h-9 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition', on ? 'text-text' : 'text-muted hover:bg-surface-2/70 hover:text-text')}
            >
              {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-surface-2" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />}
              <span className={cx('relative', on && 'text-accent')}>{n.icon}</span>
              <span className="relative">{n.label}</span>
              {n.route === 'focus' ? <span className="relative ml-auto"><TimerBadge /></span> : i < 9 ? <span className="relative ml-auto text-[10px] text-muted/50">{i + 1}</span> : null}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto flex justify-end px-1 pb-1"><SyncBadge /></div>
      <button onClick={() => navigate('insights')} className="rounded-2xl border border-border bg-surface-2/50 p-4 text-left transition hover:border-accent/40">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Level {level.level}</span>
          <span className="text-xs font-semibold text-muted">{level.title}</span>
        </div>
        <ProgressBar value={level.progress} className="mt-2.5" />
        <div className="mt-1.5 text-[11px] text-muted tabular">{level.into}/{level.needed} XP · {total.toLocaleString()} total</div>
      </button>
    </aside>
  )
}

const MOBILE: Route[] = ['today', 'plan', 'habits', 'goals', 'focus']

export function MobileNav({ route, onAdd }: { route: Route; onAdd: () => void }) {
  return (
    <>
      <button
        onClick={onAdd}
        aria-label="New task"
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-2xl bg-gradient-accent text-accent-fg shadow-[0_10px_30px_-8px_var(--accent)] active:scale-95 lg:hidden"
      >
        <Plus size={26} />
      </button>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg">
          {MOBILE.map((r) => {
            const n = NAV.find((x) => x.route === r)!
            const on = route === r
            return (
              <button key={r} onClick={() => navigate(r)} className={cx('flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition', on ? 'text-accent' : 'text-muted')}>
                {n.icon}
                {n.label}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export function MobileHeader({ route }: { route: Route }) {
  const [open, setOpen] = useState(false)
  const more = NAV.filter((n) => !MOBILE.includes(n.route))
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
      <Logo />
      <div className="flex items-center gap-1">
      <SyncBadge className="size-10" />
      <button onClick={() => setOpen(true)} aria-label="More" className={cx('grid size-10 place-items-center rounded-xl', more.some((n) => n.route === route) ? 'bg-accent-soft text-accent' : 'text-muted')}>
        <Menu size={20} />
      </button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="More">
        <div className="grid grid-cols-3 gap-2">
          {more.map((n) => (
            <button
              key={n.route}
              onClick={() => { navigate(n.route); setOpen(false) }}
              className={cx('flex flex-col items-center gap-2 rounded-2xl p-4 text-xs font-bold transition', route === n.route ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-text')}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </div>
      </Modal>
    </header>
  )
}
