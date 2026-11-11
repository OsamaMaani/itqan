/**
 * How much a device may spend drawing PDF pages (ADR-048). Pure — the browser facts are passed in —
 * so the numbers are tested. They follow pdf.js's own viewer, which caps pages at 5 MP on iOS and
 * Android, and WebKit's limits: a canvas over 16,777,216 pixels (4096²) comes out blank on iOS.
 */

export interface RenderBudget {
  /** Most pixels one page canvas may have */
  maxCanvasPixels: number
  /** Drawn pages kept for scrolling back */
  buffer: number
  /** Most pixels all kept canvases may have together */
  bufferPixels: number
  /** Pages drawn at the same time */
  concurrency: number
  devicePixelRatio: number
  /** Screens denser than this are drawn at this density (3× on an iPhone costs 2.25× the memory of 2× for little gain) */
  dprCap: number
  /** For pdf.js `canvasMaxAreaInBytes`: images above it are scaled down in the PDF engine; -1 = let pdf.js probe */
  canvasMaxAreaInBytes: number
}

export interface DeviceFacts {
  ios: boolean
  /** Phone or tablet (coarse pointer) */
  mobile: boolean
  devicePixelRatio: number
  /** GB, where the browser says (Chrome); undefined elsewhere */
  deviceMemory?: number
}

/** WebKit's largest canvas that still draws. */
export const IOS_MAX_CANVAS_PIXELS = 16_777_216

export function budgetFor(d: DeviceFacts): RenderBudget {
  const small = d.ios || d.mobile || (d.deviceMemory !== undefined && d.deviceMemory <= 4)
  return {
    maxCanvasPixels: small ? 5_242_880 : 16_777_216,
    buffer: small ? 6 : 12,
    bufferPixels: small ? 24_000_000 : 120_000_000,
    concurrency: small ? 1 : 2,
    devicePixelRatio: d.devicePixelRatio > 0 ? d.devicePixelRatio : 1,
    dprCap: 2,
    // On iOS pdf.js would find its limit by allocating ever larger canvases in the worker, which
    // WebKit can let "succeed" past what it can really draw; give it the real limit instead.
    canvasMaxAreaInBytes: d.ios ? IOS_MAX_CANVAS_PIXELS * 4 : -1,
  }
}

/** iPhone, iPod, and iPad (which reports itself as a Mac with touch). */
export function isIOS(ua: string, platform: string, maxTouchPoints: number): boolean {
  return /\b(iPad|iPhone|iPod)\b/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

/** This device's budget. */
export function renderBudget(): RenderBudget {
  if (typeof navigator === 'undefined') return budgetFor({ ios: false, mobile: false, devicePixelRatio: 1 })
  const nav = navigator as Navigator & { deviceMemory?: number }
  return budgetFor({
    ios: isIOS(nav.userAgent, nav.platform, nav.maxTouchPoints ?? 0),
    mobile: typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
    devicePixelRatio: typeof devicePixelRatio === 'number' ? devicePixelRatio : 1,
    deviceMemory: nav.deviceMemory,
  })
}
