import { motion } from 'motion/react'
import { useState } from 'react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { useSyncSetup } from './SyncPanel'
import { Logo } from './Shell'
import { Button, cx, Input } from './ui'

export function Onboarding() {
  const done = useStore((s) => s.settings.onboarded)
  const complete = useStore((s) => s.completeOnboarding)
  const [name, setName] = useState('')
  const [starter, setStarter] = useState(true)
  if (done) return null

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-bg/80 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        className="w-full max-w-md rounded-3xl border border-border bg-surface p-7 shadow-2xl"
      >
        <Logo />
        <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight">
          Small deeds, done <span className="text-gradient">consistently</span>.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Itqan keeps your daily tasks, habits and long-term goals in one calm place — and turns steady progress into something you can see.
        </p>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); complete(name, starter) }}>
          <Input autoFocus placeholder="What should I call you?" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
          <button
            type="button"
            onClick={() => setStarter((s) => !s)}
            className={cx('flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition', starter ? 'border-accent bg-accent-soft' : 'border-border')}
          >
            <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 text-[11px] font-black', starter ? 'border-accent bg-accent text-accent-fg' : 'border-border')}>{starter && '✓'}</span>
            <span>
              <span className="block text-sm font-bold">Start with my routine</span>
              <span className="mt-0.5 block text-xs text-muted">Areas, habits and example goals for Quran revision, French, the gym, reading and courses. Edit or delete anything later.</span>
            </span>
          </button>
          <Button variant="primary" type="submit" className="h-12 w-full text-base">Bismillah — let’s begin</Button>
          <button
            type="button"
            onClick={() => { complete(name, false); navigate('settings'); useSyncSetup.setState({ open: true }) }}
            className="w-full text-center text-sm font-semibold text-muted hover:text-accent"
          >
            I already use Itqan on another device →
          </button>
        </form>
      </motion.div>
    </div>
  )
}
