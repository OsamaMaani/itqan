import { format } from 'date-fns'
import { AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { useState } from 'react'
import { QuickAdd } from '../components/QuickAdd'
import { TaskItem } from '../components/TaskItem'
import { Button, Card, cx, IconButton, PageHeader } from '../components/ui'
import { addDaysKey, fromKey, weekDays } from '../lib/date'
import { useData, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import type { DateKey, Task } from '../lib/types'

const sort = (a: Task, b: Task) => Number(a.done) - Number(b.done) || b.priority - a.priority || a.order - b.order

export function PlanPage() {
  const d = useData()
  const today = useToday()
  const [offset, setOffset] = useState(0)
  const days = weekDays(addDaysKey(today, offset * 7), d.settings.weekStartsOn)
  const inbox = d.tasks.filter((t) => t.date === null && !t.done).sort(sort)

  return (
    <div>
      <PageHeader
        title="Plan"
        subtitle={<><span className="hidden sm:inline">Drag tasks between days. </span><span className="sm:hidden">Tap a task to change its day. </span>Unscheduled tasks wait in the Inbox.</>}
        right={
          <div className="flex items-center gap-1">
            <IconButton label="Previous week" onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={18} /></IconButton>
            <Button size="sm" variant={offset === 0 ? 'soft' : 'outline'} onClick={() => setOffset(0)}>This week</Button>
            <IconButton label="Next week" onClick={() => setOffset((o) => o + 1)}><ChevronRight size={18} /></IconButton>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <DayColumn day={null} title="Inbox" subtitle="Someday / unscheduled" tasks={inbox} icon={<Inbox size={16} />} />
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {days.map((k) => (
            <DayColumn
              key={k}
              day={k}
              title={format(fromKey(k), 'EEEE')}
              subtitle={format(fromKey(k), 'MMM d')}
              tasks={d.tasks.filter((t) => t.date === k).sort(sort)}
              highlight={k === today}
              past={k < today}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DayColumn({ day, title, subtitle, tasks, highlight, past, icon }: {
  day: DateKey | null
  title: string
  subtitle: string
  tasks: Task[]
  highlight?: boolean
  past?: boolean
  icon?: React.ReactNode
}) {
  const move = useStore((s) => s.moveTask)
  const [over, setOver] = useState(false)
  const done = tasks.filter((t) => t.done).length
  const mins = tasks.filter((t) => !t.done).reduce((s, t) => s + (t.estimateMin ?? 0), 0)

  return (
    <Card
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const id = e.dataTransfer.getData('text/task-id')
        if (id) move(id, day)
      }}
      className={cx('flex flex-col p-2 transition sm:min-h-48', highlight && 'border-accent/50 ring-4 ring-accent-soft', over && 'border-accent bg-accent-soft', past && 'opacity-70')}
    >
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className={cx('text-sm font-bold', highlight && 'text-accent')}>{title}</div>
            <div className="text-[11px] text-muted">{subtitle}</div>
          </div>
        </div>
        <div className="text-right text-[11px] text-muted tabular">
          {tasks.length > 0 && <div>{done}/{tasks.length}</div>}
          {mins > 0 && <div>~{mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`}</div>}
        </div>
      </div>
      <div className="flex-1">
        <AnimatePresence initial={false}>
          {tasks.map((t) => <TaskItem key={t.id} task={t} />)}
        </AnimatePresence>
      </div>
      <QuickAdd defaultDate={day} placeholder="Add…" className="mt-1 border-dashed bg-transparent [&_input]:h-9 sm:[&_input]:text-sm" />
    </Card>
  )
}
