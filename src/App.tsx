import { useEffect, useRef, useState } from 'react'
import { CommandPalette } from './components/CommandPalette'
import { Onboarding } from './components/Onboarding'
import { MobileHeader, MobileNav, Sidebar } from './components/Shell'
import { TaskEditor } from './components/TaskEditor'
import { TimerWatcher } from './components/TimerWatcher'
import { Toaster } from './components/Toaster'
import { tx } from './i18n/core'
import { useDocumentLanguage } from './i18n/react'
import { celebrate } from './lib/celebrate'
import { useMediaQuery, useProgress } from './lib/hooks'
import { navigate, ROUTES, useRoute, useRouteParam, type Route } from './lib/router'
import { startNotifier } from './lib/notifier'
import { refreshPush } from './lib/pushDevice'
import { startSync } from './lib/sync/engine'
import { useStore } from './lib/store'
import { toast } from './lib/toast'
import { FocusPage } from './pages/Focus'
import { GoalsPage } from './pages/Goals'
import { AchievementsPage, GlobalAchievementEditor } from './pages/Achievements'
import { ConnectionsPage } from './pages/Connections'
import { HabitsPage } from './pages/Habits'
import { IdeasPage } from './pages/Ideas'
import { InsightsPage } from './pages/Insights'
import { MemoriesPage } from './pages/Memories'
import { PlanPage } from './pages/Plan'
import { ProjectsPage } from './pages/Projects'
import { RemindersPage } from './pages/Reminders'
import { ReviewPage } from './pages/Review'
import { SettingsPage } from './pages/Settings'
import { TodayPage } from './pages/Today'
import { TrainingPage } from './pages/Training'

const PAGES: Record<Route, () => React.ReactElement> = {
  today: TodayPage, plan: PlanPage, habits: HabitsPage, goals: GoalsPage, projects: ProjectsPage, connections: ConnectionsPage,
  focus: FocusPage, training: TrainingPage, ideas: IdeasPage, reminders: RemindersPage, memories: MemoriesPage, achievements: AchievementsPage,
  insights: InsightsPage, review: ReviewPage, settings: SettingsPage,
}

export default function App() {
  const route = useRoute()
  const param = useRouteParam()
  const [palette, setPalette] = useState(false)
  const [newTask, setNewTask] = useState(false)
  const theme = useStore((s) => s.settings.theme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  useDocumentLanguage()

  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && systemDark)
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a100e' : '#f4f6f5')
  }, [theme, systemDark])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [route, param])
  useEffect(() => { startSync(); startNotifier(); void refreshPush() }, [])

  useKeyboard({ openPalette: () => setPalette(true), openNewTask: () => setNewTask(true) })
  useLevelUp()
  useBackupReminder()

  const Page = PAGES[route]

  return (
    <div className="flex min-h-screen">
      <Sidebar route={route} onAdd={() => setPalette(true)} />
      <div className="min-w-0 flex-1">
        <MobileHeader />
        <main className="mx-auto w-full max-w-7xl px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {/* The new page renders at once and only fades in. No exit animation to wait for: with
              AnimatePresence mode="wait", a page change arriving mid-animation (create a project →
              its page → back) or a paused window could leave the page blank (fixed 2026-10-16). */}
          <div key={`${route}/${param ?? ''}`} className="page-enter">
              <Page />
          </div>
        </main>
      </div>
      <MobileNav route={route} onAdd={() => setNewTask(true)} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <TaskEditor open={newTask} onClose={() => setNewTask(false)} />
      <TimerWatcher />
      <GlobalAchievementEditor />
      <Toaster />
      <Onboarding />
    </div>
  )
}

function useKeyboard({ openPalette, openNewTask }: { openPalette: () => void; openNewTask: () => void }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return }
      const el = e.target as HTMLElement
      if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.key === 'n') { e.preventDefault(); openNewTask() }
      const i = Number(e.key)
      if (i >= 1 && i <= 9) navigate(ROUTES[i - 1])
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [openPalette, openNewTask])
}

/** Celebrate when the derived level goes up — never on first load. */
function useLevelUp() {
  const { level } = useProgress()
  const prev = useRef<number | null>(null)
  useEffect(() => {
    if (prev.current !== null && level.level > prev.current) {
      celebrate.levelUp()
      const t = tx()
      toast({ emoji: '⭐', message: t.f(t.m.app.levelUp, { n: level.level, title: t.m.levels[level.rank] }) }, 6000)
    }
    prev.current = level.level
  }, [level.level, level.rank])
}

/** Data lives only in this browser (ADR-002), so nudge for a backup every two weeks. */
function useBackupReminder() {
  useEffect(() => {
    const t = setTimeout(() => {
      const s = useStore.getState()
      if (!s.settings.onboarded) return
      const last = s.settings.lastBackupAt ? new Date(s.settings.lastBackupAt).getTime() : 0
      const first = s.tasks.reduce((m, t) => Math.min(m, new Date(t.createdAt).getTime()), Date.now())
      const days = (Date.now() - Math.max(last, first)) / 86_400_000
      if (days >= 14) {
        const { m } = tx()
        toast({ emoji: '💾', message: last ? m.app.backupDue : m.app.backupNever, action: { label: m.app.backUp, run: () => navigate('settings') } }, 10000)
      }
    }, 3000)
    return () => clearTimeout(t)
  }, [])
}
