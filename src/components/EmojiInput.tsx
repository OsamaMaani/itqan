import { useState } from 'react'
import { cx } from './ui'

const SUGGESTED = ['📖', '🗣️', '📚', '🏋️', '🎓', '🌱', '🧘', '💧', '🏃', '🕌', '✍️', '💻', '🎯', '🧠', '🍎', '😴', '🤲', '🎨', '🎸', '💼', '🇫🇷', '🌙', '☀️', '🔥']

export function EmojiInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-xl border border-border bg-surface-2/60 text-xl hover:border-accent">
        {value || '✨'}
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-10 grid w-64 grid-cols-6 gap-1 rounded-2xl border border-border bg-surface p-2 shadow-xl">
          {SUGGESTED.map((e) => (
            <button key={e} type="button" onClick={() => { onChange(e); setOpen(false) }} className={cx('grid size-9 place-items-center rounded-lg text-lg hover:bg-surface-2', e === value && 'bg-accent-soft')}>
              {e}
            </button>
          ))}
          <input
            placeholder="Or type one"
            maxLength={4}
            className="col-span-6 mt-1 rounded-lg border border-border bg-surface-2/60 px-2 py-1 text-base outline-none sm:text-sm"
            onChange={(e) => e.target.value && onChange(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
