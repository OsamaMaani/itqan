import type { AreaColor } from './types'

/** Area colours as hex, so they can be used in inline styles and SVG alike. */
export const AREA_HEX: Record<AreaColor, string> = {
  emerald: '#10b981',
  teal: '#14b8a6',
  sky: '#0ea5e9',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  amber: '#f59e0b',
  orange: '#f97316',
  lime: '#84cc16',
  slate: '#64748b',
}

export const NEUTRAL_HEX = '#94a3b8'

export function hexA(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`
}
