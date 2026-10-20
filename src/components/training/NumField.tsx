import { useState } from 'react'
import { Input } from '../ui'

/** "12", "12.5" and "12,5" (a comma keyboard) → a number; anything else → null. */
export function parseNumber(text: string): number | null {
  const s = text.trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * A number the person types: keeps the text as typed (so "1." and an empty field survive) and
 * reports the parsed number, or null when empty. It reads `value` only when it first appears —
 * give it a `key` to make it start over.
 */
export function NumField({ value, onChange, decimal, placeholder, className, 'aria-label': ariaLabel }: {
  value: number | null
  onChange: (v: number | null) => void
  decimal?: boolean
  placeholder?: string
  className?: string
  'aria-label'?: string
}) {
  const [text, setText] = useState(value === null ? '' : String(value))
  return (
    <Input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parseNumber(e.target.value))
      }}
    />
  )
}
