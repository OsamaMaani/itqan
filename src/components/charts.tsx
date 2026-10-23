import { motion } from 'motion/react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/react'
import { cx } from './ui'

// Charts for Insights (ADR-032). Drawn by hand to stay offline and small: thin columns grown from
// one baseline, hairline gridlines, an optional average line, and a tooltip that follows the
// pointer and also opens on tap. Time runs left to right in every language, like the heatmap.

/** Tick gaps that read well as durations: 5m, 10m, 15m, 30m, 1h, 2h… */
export const MINUTE_STEPS = [5, 10, 15, 30, 60, 120, 180, 240, 360, 480, 600]

/** A round axis top and its ticks for data up to `max`. Steps are 1-2-5 unless given. */
export function niceScale(max: number, ticks = 4, steps?: number[]): { top: number; ticks: number[] } {
  const raw = Math.max(max, 1) / ticks
  let step: number
  if (steps) {
    const last = steps[steps.length - 1]
    step = steps.find((s) => s >= raw) ?? Math.ceil(raw / last) * last
  } else {
    const p = 10 ** Math.floor(Math.log10(raw))
    step = [1, 2, 5, 10].map((x) => x * p).find((s) => s >= raw) ?? 10 * p
  }
  const top = Math.ceil(Math.max(max, 1) / step) * step
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) }
}

/** Where a tooltip sits over a slot: centred, or held inside the plot near its edges. */
function tipShift(x: number): string {
  if (x < 0.18) return 'translate(0, -100%)'
  if (x > 0.82) return 'translate(-100%, -100%)'
  return 'translate(-50%, -100%)'
}

export function ColumnChart({ values, format, tip, xLabels, steps, height = 160, average, emphasis, ariaLabel, axisWidth = 44 }: {
  values: number[]
  /** Formats the axis ticks and the average line. */
  format: (v: number) => string
  tip: (i: number) => ReactNode
  /** Labels under the axis, at the given slots. */
  xLabels: { i: number; label: string }[]
  steps?: number[]
  height?: number
  average?: number
  /** Slots drawn in full colour; the rest are quieter. Without it every column is full colour. */
  emphasis?: (i: number) => boolean
  ariaLabel: string
  axisWidth?: number
}) {
  const t = useI18n()
  const [active, setActive] = useState<number | null>(null)
  const plot = useRef<HTMLDivElement>(null)
  // A finger lifting ends the pointer, so a tapped tooltip stays until the next tap elsewhere.
  useEffect(() => {
    if (active === null) return
    const away = (e: PointerEvent) => { if (!plot.current?.contains(e.target as Node)) setActive(null) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [active])
  const { top, ticks } = niceScale(Math.max(...values, average ?? 0), 4, steps)
  const n = values.length
  const gap = n > 60 ? 1 : n > 31 ? 2 : 3
  const x = active === null ? 0 : (active + 0.5) / n

  return (
    <div dir="ltr" role="img" aria-label={ariaLabel} className="select-none">
      <div className="flex">
        <div className="relative shrink-0" style={{ width: axisWidth, height }}>
          {ticks.map((v) => (
            <span key={v} className="absolute end-2 translate-y-1/2 whitespace-nowrap text-[10px] font-medium text-muted tabular" style={{ bottom: `${(v / top) * 100}%` }}><bdi dir={t.dir}>{format(v)}</bdi></span>
          ))}
        </div>
        <div ref={plot} className="relative flex-1" style={{ height }} onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
          {ticks.map((v) => (
            <div key={v} className={cx('absolute inset-x-0 border-t', v === 0 ? 'border-border' : 'border-border/60')} style={{ bottom: `${(v / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end" style={{ gap }}>
            {values.map((v, i) => {
              const strong = emphasis ? emphasis(i) : true
              return (
                <div
                  key={i}
                  className="flex h-full flex-1 cursor-default items-end justify-center"
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                >
                  <motion.div
                    className={cx('w-full max-w-6 rounded-t-[4px]', strong ? 'bg-gradient-accent' : 'bg-accent')}
                    style={{
                      opacity: (v ? (strong ? 1 : 0.42) : 1) * (active !== null && active !== i ? 0.6 : 1),
                      background: v ? undefined : 'var(--border)',
                      minHeight: v ? 3 : 2,
                    }}
                    initial={{ height: '0%' }}
                    animate={{ height: `${(v / top) * 100}%` }}
                    transition={{ delay: Math.min(i * 0.008, 0.4), type: 'spring', bounce: 0.15 }}
                  />
                </div>
              )
            })}
          </div>
          {average !== undefined && average > 0 && (
            <div className="pointer-events-none absolute inset-x-0 border-t border-text/35" style={{ bottom: `${(average / top) * 100}%` }}>
              <span className="absolute end-0 bottom-0.5 rounded bg-surface/90 px-1 text-[10px] font-semibold text-muted"><bdi dir={t.dir}>{t.f(t.m.insights.average, { value: format(average) })}</bdi></span>
            </div>
          )}
          {active !== null && (
            <div
              dir={t.dir}
              className="pointer-events-none absolute top-0 z-10 -mt-1.5 whitespace-nowrap rounded-lg bg-text px-2.5 py-1.5 text-[11px] font-semibold text-bg shadow-lg"
              style={{ left: `${x * 100}%`, transform: tipShift(x) }}
            >
              {tip(active)}
            </div>
          )}
        </div>
      </div>
      <div className="relative mt-1.5 h-4" style={{ marginInlineStart: axisWidth }}>
        {xLabels.map(({ i, label }) => {
          const p = (i + 0.5) / n
          return (
            <span
              key={i}
              className="absolute whitespace-nowrap text-[10px] font-semibold text-muted"
              style={{ left: `${p * 100}%`, transform: p < 0.08 ? 'translateX(-20%)' : p > 0.92 ? 'translateX(-80%)' : 'translateX(-50%)' }}
            >
              <bdi dir={t.dir}>{label}</bdi>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** A small trend line under a headline number: a 2px line over a faint wash, the last point marked. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const n = values.length
  if (n < 2) return null
  const max = Math.max(...values, 1)
  const W = 100
  const H = 30
  const y = (v: number) => H - 2 - (v / max) * (H - 5)
  const pts = values.map((v, i) => `${((i / (n - 1)) * W).toFixed(2)},${y(v).toFixed(2)}`)
  const line = `M${pts.join(' L')}`
  return (
    <div dir="ltr" className={cx('relative', className)} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-full w-full overflow-visible">
        <path d={`${line} L${W},${H} L0,${H} Z`} fill="var(--accent)" fillOpacity={0.1} />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute size-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-accent ring-2 ring-surface" style={{ right: 0, top: `${(y(values[n - 1]) / H) * 100}%` }} />
    </div>
  )
}

/**
 * A change against the previous period. Up is shown in the accent; down stays quiet — a slower
 * week is information, not a failure (the copy rule in 08-design-system.md).
 */
export function Delta({ value, text }: { value: number | null; text?: string }) {
  const t = useI18n()
  if (value === null || !Number.isFinite(value)) return null
  const up = value > 0.005
  const down = value < -0.005
  const Icon = down ? TrendingDown : TrendingUp
  return (
    <span
      title={t.m.insights.vsPrevious}
      className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold', up ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted')}
    >
      {(up || down) && <Icon size={12} className="rtl:-scale-x-100" />}
      <bdi>{text ?? t.n(value, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 0 })}</bdi>
    </span>
  )
}

/** One bar split into shares, a 2px gap between parts; each part names itself on hover. */
export function ShareBar({ parts, height = 10 }: { parts: { key: string; value: number; color: string; title: string }[]; height?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (!total) return null
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height }}>
      {parts.filter((p) => p.value > 0).map((p, i) => (
        <motion.div
          key={p.key}
          title={p.title}
          className="h-full first:rounded-s-full last:rounded-e-full"
          style={{ background: p.color, flexBasis: 0 }}
          initial={{ flexGrow: 0 }}
          animate={{ flexGrow: p.value / total }}
          transition={{ delay: i * 0.04, type: 'spring', bounce: 0.1, duration: 0.7 }}
        />
      ))}
    </div>
  )
}
