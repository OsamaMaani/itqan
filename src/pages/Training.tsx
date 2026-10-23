import { ExercisesTab } from '../components/training/ExercisesTab'
import { HistoryTab } from '../components/training/HistoryTab'
import { LiveWorkout } from '../components/training/LiveWorkout'
import { OverviewTab } from '../components/training/OverviewTab'
import { RoutinesTab } from '../components/training/RoutinesTab'
import { usePageAction } from '../components/Shell'
import { PageHeader, Segmented } from '../components/ui'
import { useI18n } from '../i18n/react'
import { navigate, useRouteParam } from '../lib/router'

/**
 * Training (ADR-027, memory/11-training.md). One route, four tabs and the live workout:
 * #/training · #/training/history · #/training/routines · #/training/exercises · #/training/workout
 */
const TABS = ['overview', 'history', 'routines', 'exercises'] as const
type Tab = (typeof TABS)[number]

export function TrainingPage() {
  const { m } = useI18n()
  const param = useRouteParam()
  // No "+" here: the live workout's effort buttons and rest timer sit where it would.
  usePageAction(null)
  if (param === 'workout') return <LiveWorkout />
  const tab: Tab = TABS.includes(param as Tab) ? (param as Tab) : 'overview'

  return (
    <div>
      <PageHeader title={m.nav.training} subtitle={m.training.subtitle} />
      <Segmented
        className="mb-5"
        value={tab}
        onChange={(v) => navigate('training', v === 'overview' ? undefined : v)}
        options={TABS.map((v) => ({ value: v, label: m.training.tabs[v] }))}
      />
      {tab === 'overview' && <OverviewTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'routines' && <RoutinesTab />}
      {tab === 'exercises' && <ExercisesTab />}
    </div>
  )
}
