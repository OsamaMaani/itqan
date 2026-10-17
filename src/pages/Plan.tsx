import { AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { useState } from 'react'
import { QuickAdd } from '../components/QuickAdd'
import { TaskItem } from '../components/TaskItem'
import { Button, Card, cx, IconButton, PageHeader } from '../components/ui'
import { useI18n } from '../i18n/react'
import { addDaysKey, weekDays } from '../lib/date'
import { useData, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import type { DateKey, Task } from '../lib/types'

const sort = (a: Task, b: Task) => Number(a.done) - Number(b.done) || b.priority - a.priority || a.order - b.order

export function PlanPage() {
  const t = useI18n()
  const { m } = t
  const d = useData()
  const today = useToday()
  const [offset, setOffset] = useState(0)
  const days = weekDays(addDaysKey(today, offset * 7), d.settings.weekStartsOn)
  const inbox = d.tasks.filter((x) => x.date === null && !x.done).sort(sort)

  return (
    <div>
      <PageHeader
        title={m.nav.plan}
        subtitle={<><span className="hidden sm:inline">{m.plan.subtitleDesktop}</span><span className="sm:hidden">{m.plan.subtitleTouch}</span></>}
        right={
          <div className="flex items-center gap-1">
            <IconButton label={m.plan.previousWeek} onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={18} className="rtl:-scale-x-100" /></IconButton>
            <Button size="sm" variant={offset === 0 ? 'soft' : 'outline'} onClick={() => setOffset(0)}>{m.plan.thisWeek}</Button>
            <IconButton label={m.plan.nextWeek} onClick={() => setOffset((o) => o + 1)}><ChevronRight size={18} className="rtl:-scale-x-100" /></IconButton>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <DayColumn day={null} title={m.plan.inbox} subtitle={m.plan.inboxSubtitle} tasks={inbox} icon={<Inbox size={16} />} />
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {days.map((k) => (
            <DayColumn
              key={k}
              day={k}
              title={t.d(k, 'weekday', true)}
              subtitle={t.d(k, 'short')}
              tasks={d.tasks.filter((x) => x.date === k).sort(sort)}
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
  const t = useI18n()
  const move = useStore((s) => s.moveTask)
  const [over, setOver] = useState(false)
  const done = tasks.filter((x) => x.done).length
  const mins = tasks.filter((x) => !x.done).reduce((s, x) => s + (x.estimateMin ?? 0), 0)

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
        <div className="text-end text-[11px] text-muted tabular">
          {tasks.length > 0 && <div>{t.n(done)}/{t.n(tasks.length)}</div>}
          {mins > 0 && <div>~{t.dur(mins)}</div>}
        </div>
      </div>
      <div className="flex-1">
        <AnimatePresence initial={false}>
          {tasks.map((x) => <TaskItem key={x.id} task={x} />)}
        </AnimatePresence>
      </div>
      <QuickAdd defaultDate={day} placeholder={t.m.plan.addPlaceholder} className="mt-1 border-dashed bg-transparent [&_input]:h-9 sm:[&_input]:text-sm" />
    </Card>
  )
}
