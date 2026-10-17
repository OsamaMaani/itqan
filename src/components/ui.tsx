import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { useI18n } from '../i18n/react'
import { AREA_HEX } from '../lib/colors'
import type { Area } from '../lib/types'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-2xl border border-border bg-surface/80 shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur-sm', className)} {...rest}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{children}</h2>
      {right}
    </div>
  )
}

type Variant = 'primary' | 'soft' | 'ghost' | 'danger' | 'outline'

export function Button({ variant = 'soft', size = 'md', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.97] disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-gradient-accent text-accent-fg shadow-[0_6px_20px_-6px_var(--accent)] hover:brightness-110',
        variant === 'soft' && 'bg-surface-2 text-text hover:bg-border/70',
        variant === 'ghost' && 'text-muted hover:bg-surface-2 hover:text-text',
        variant === 'outline' && 'border border-border text-text hover:bg-surface-2',
        variant === 'danger' && 'bg-danger/10 text-danger hover:bg-danger/20',
        className,
      )}
      {...rest}
    />
  )
}

export function IconButton({ className, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx('grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text active:scale-95', className)}
      {...rest}
    />
  )
}

const field = 'rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-base text-text sm:text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent-soft'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(field, 'h-10', !/(^|\s)w-/.test(className ?? '') && 'w-full', className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(field, 'min-h-20 w-full resize-y', className)} {...rest} />
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx(field, 'h-10 w-full appearance-none pe-9', className)} {...rest} />
      <ChevronDown size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-xs font-semibold text-muted">
      {children}
      {hint && <span className="font-normal opacity-70">{hint}</span>}
    </span>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, className }: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  className?: string
}) {
  const id = useId()
  return (
    <div className={cx('inline-flex max-w-full flex-wrap gap-y-1 rounded-xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'relative rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            value === o.value ? 'text-text' : 'text-muted hover:text-text',
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-lg bg-surface shadow-sm" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function AreaChip({ area, className }: { area: Area | undefined | null; className?: string }) {
  if (!area) return null
  const hex = AREA_HEX[area.color]
  return (
    <span
      className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', className)}
      style={{ color: hex, background: `${hex}1a` }}
    >
      <span>{area.emoji}</span>
      {area.name}
    </span>
  )
}

export function ProgressBar({ value, color, className, height = 6 }: { value: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-surface-2', className)} style={{ height }}>
      <motion.div
        className={cx('h-full rounded-full', !color && 'bg-gradient-accent')}
        style={color ? { background: color } : undefined}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
        transition={{ type: 'spring', bounce: 0.15, duration: 0.8 }}
      />
    </div>
  )
}

export function ProgressRing({ value, size = 64, stroke = 7, color, children, track = 'var(--surface-2)' }: {
  value: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
  track?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  const gid = `ring-${size}-${stroke}`
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color ?? `url(#${gid})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: 'spring', bounce: 0.1, duration: 1 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const { m } = useI18n()
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    // Keep the page behind the dialog still (iOS would otherwise scroll it).
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', on); document.body.style.overflow = prev }
  }, [open, onClose])

  // Rendered into <body>: an ancestor with a transform, filter or backdrop-filter would otherwise
  // become the containing block of this `position: fixed` layer and clip it (the "missing Save
  // button" and "menu covers the top bar" bugs, 2026-10-16).
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx(
              'relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-border bg-surface shadow-2xl sm:max-h-[88dvh] sm:rounded-3xl',
              wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
            )}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-5">
              <h3 className="text-lg font-bold">{title}</h3>
              <IconButton label={m.common.close} onClick={onClose}><X size={18} /></IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <div className="text-3xl">{emoji}</div>
      <div className="font-semibold">{title}</div>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted">{children}</kbd>
}
