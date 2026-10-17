import { Plus } from 'lucide-react'
import { useState } from 'react'
import { GoalCard } from '../components/GoalCard'
import { GoalEditor } from '../components/GoalEditor'
import { Button, EmptyState, PageHeader, Segmented } from '../components/ui'
import { useI18n } from '../i18n/react'
import { goalProgress } from '../lib/goals'
import { useData } from '../lib/hooks'
import type { Goal } from '../lib/types'

export function GoalsPage() {
  const t = useI18n()
  const { m } = t
  const d = useData()
  const [tab, setTab] = useState<Goal['status']>('active')
  const [creating, setCreating] = useState(false)

  const list = d.goals.filter((g) => g.status === tab)
  const active = d.goals.filter((g) => g.status === 'active')
  const avg = active.length ? active.reduce((s, g) => s + goalProgress(g, d.goalLogs), 0) / active.length : 0
  const counts = { active: active.length, paused: d.goals.filter((g) => g.status === 'paused').length, done: d.goals.filter((g) => g.status === 'done').length }

  return (
    <div>
      <PageHeader
        title={m.nav.goals}
        subtitle={active.length ? t.f(m.goals.subtitleActive, { n: active.length, avg: t.pct(avg) }) : m.goals.subtitleEmpty}
        right={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={16} /> {m.goals.newGoal}</Button>}
      />
      <Segmented
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: t.f(m.goals.tabs.active, { n: counts.active }) },
          { value: 'paused', label: t.f(m.goals.tabs.paused, { n: counts.paused }) },
          { value: 'done', label: t.f(m.goals.tabs.done, { n: counts.done }) },
        ]}
      />
      {list.length === 0 ? (
        <EmptyState emoji={tab === 'done' ? '🏆' : '🎯'} title={tab === 'done' ? m.goals.emptyDoneTitle : m.goals.emptyTitle}>
          {tab === 'active' ? m.goals.emptyActive : tab === 'done' ? m.goals.emptyDone : m.goals.emptyPaused}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}
      <GoalEditor open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
