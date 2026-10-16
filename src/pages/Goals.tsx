import { Plus } from 'lucide-react'
import { useState } from 'react'
import { GoalCard } from '../components/GoalCard'
import { GoalEditor } from '../components/GoalEditor'
import { Button, EmptyState, PageHeader, Segmented } from '../components/ui'
import { goalProgress } from '../lib/goals'
import { useData } from '../lib/hooks'
import type { Goal } from '../lib/types'

export function GoalsPage() {
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
        title="Goals"
        subtitle={active.length ? `${active.length} active · ${Math.round(avg * 100)}% average progress` : 'Your long-term objectives — what all the daily work is for.'}
        right={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={16} /> New goal</Button>}
      />
      <Segmented
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: `Active · ${counts.active}` },
          { value: 'paused', label: `Paused · ${counts.paused}` },
          { value: 'done', label: `Achieved · ${counts.done}` },
        ]}
      />
      {list.length === 0 ? (
        <EmptyState emoji={tab === 'done' ? '🏆' : '🎯'} title={tab === 'done' ? 'No goals achieved yet' : 'Nothing here'}>
          {tab === 'active' ? 'A good goal is specific and measurable: “Finish 12 modules by December”, not “study more”.' : tab === 'done' ? 'Your first one is closer than it looks.' : 'Paused goals wait here without nagging you.'}
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
