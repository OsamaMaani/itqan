import { describe, expect, it } from 'vitest'
import { drawScale } from '../../components/library/pageRenderer'
import { budgetFor, IOS_MAX_CANVAS_PIXELS, isIOS } from '../pdfBudget'

describe('which devices are iOS', () => {
  it('iPhone and iPod by name; an iPad that reports itself as a Mac by its touch points', () => {
    expect(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)', 'iPhone', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false)
    expect(isIOS('Mozilla/5.0 (X11; Linux x86_64) Chrome/140', 'Linux x86_64', 0)).toBe(false)
  })
})

describe('drawing budgets', () => {
  it('iOS: pdf.js gets WebKit’s real canvas limit instead of probing; one page at a time, a small buffer', () => {
    const b = budgetFor({ ios: true, mobile: true, devicePixelRatio: 3 })
    expect(b.canvasMaxAreaInBytes).toBe(IOS_MAX_CANVAS_PIXELS * 4)
    expect(b).toMatchObject({ concurrency: 1, buffer: 6, maxCanvasPixels: 5_242_880, dprCap: 2 })
  })
  it('a laptop draws two at a time, keeps more, and lets pdf.js find its own limit', () => {
    const b = budgetFor({ ios: false, mobile: false, devicePixelRatio: 1.25 })
    expect(b).toMatchObject({ concurrency: 2, buffer: 12, canvasMaxAreaInBytes: -1, devicePixelRatio: 1.25 })
  })
  it('a low-memory Android phone is treated like a phone', () => {
    expect(budgetFor({ ios: false, mobile: false, devicePixelRatio: 2, deviceMemory: 4 }).concurrency).toBe(1)
  })
})

describe('the scale a page is drawn at', () => {
  const phone = budgetFor({ ios: true, mobile: true, devicePixelRatio: 3 })
  it('is the shown width times the screen density, capped at 2×', () => {
    // A 612 pt wide page shown 359 px wide on a 3× iPhone is drawn at 2×: 718 px.
    expect(612 * drawScale(612, 792, 359, phone)).toBeCloseTo(718)
  })
  it('never exceeds the pixel budget, and a retry draws at a quarter of it', () => {
    const s = drawScale(612, 792, 359 * 3, phone)
    expect(612 * s * 792 * s).toBeLessThanOrEqual(phone.maxCanvasPixels + 1)
    const r = drawScale(612, 792, 359 * 3, phone, true)
    expect(612 * r * 792 * r).toBeLessThanOrEqual(phone.maxCanvasPixels / 4 + 1)
  })
})
