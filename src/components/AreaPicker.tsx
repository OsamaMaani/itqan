import { useI18n } from '../i18n/react'
import { AREA_HEX } from '../lib/colors'
import { useStore } from '../lib/store'
import { cx } from './ui'

export function AreaPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { m } = useI18n()
  const areas = useStore((s) => s.areas).filter((a) => !a.archived)
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cx('rounded-lg border px-2.5 py-1 text-xs font-semibold transition', value === null ? 'border-text/30 bg-surface-2' : 'border-border text-muted hover:bg-surface-2')}
      >
        {m.common.none.area}
      </button>
      {areas.map((a) => {
        const hex = AREA_HEX[a.color]
        const on = value === a.id
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className="rounded-lg border px-2.5 py-1 text-xs font-semibold transition"
            style={on ? { borderColor: hex, background: `${hex}22`, color: hex } : { borderColor: 'var(--border)' }}
          >
            {a.emoji} {a.name}
          </button>
        )
      })}
    </div>
  )
}
