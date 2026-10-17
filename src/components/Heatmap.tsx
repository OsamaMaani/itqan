import { useI18n } from '../i18n/react'
import { addDaysKey, fromKey, weekStartKey } from '../lib/date'
import type { DateKey } from '../lib/types'

/** GitHub-style calendar. `value(day)` returns 0..1, or null for "not applicable". */
export function Heatmap({ end, weeks = 18, weekStartsOn, value, color = 'var(--accent)', cell = 12, label }: {
  end: DateKey
  weeks?: number
  weekStartsOn: 0 | 1 | 6
  value: (day: DateKey) => number | null
  color?: string
  cell?: number
  label?: (day: DateKey, v: number | null) => string
}) {
  const t = useI18n()
  const start = addDaysKey(weekStartKey(end, weekStartsOn), -(weeks - 1) * 7)
  const gap = 3
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDaysKey(start, w * 7 + d)))
  // Weeks are placed by absolute coordinates, oldest to newest, so the grid stays left to right even in Arabic.
  return (
    <div dir="ltr" className="overflow-x-auto">
      <svg width={weeks * (cell + gap)} height={7 * (cell + gap) + 14} className="block">
        {cols.map((days, w) => (
          <g key={w} transform={`translate(${w * (cell + gap)}, 14)`}>
            {fromKey(days[0]).getDate() <= 7 && (
              <text y={-4} className="fill-[var(--muted)] text-[9px] font-semibold">{t.d(days[0], 'monthShort')}</text>
            )}
            {days.map((k, d) => {
              const future = k > end
              const v = future ? null : value(k)
              return (
                <rect
                  key={k}
                  y={d * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={3}
                  fill={v && v > 0 ? color : 'var(--surface-2)'}
                  fillOpacity={v && v > 0 ? 0.25 + 0.75 * Math.min(1, v) : future ? 0.3 : 1}
                >
                  <title>{label ? label(k, v) : t.d(k, 'weekdayShort')}</title>
                </rect>
              )
            })}
          </g>
        ))}
      </svg>
    </div>
  )
}
