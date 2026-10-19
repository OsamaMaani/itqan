import { describe, expect, it } from 'vitest'

// Every source file under src/, as text (tests excluded).
const SOURCES = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/__tests__/**'], { query: '?raw', import: 'default', eager: true })

describe('source guards', () => {
  it('reads the sources', () => {
    expect(Object.keys(SOURCES)).toContain('/src/components/GoalEditor.tsx')
  })

  // An optional call skips its arguments too: when cb is undefined, cb?.(save(x)) never runs
  // save(x). This is how "New goal" on the Goals page silently created nothing (2026-10-19).
  it('no optional call has a call among its arguments', () => {
    const hits = Object.entries(SOURCES).flatMap(([file, text]) =>
      text.split('\n').flatMap((line, i) => (/\?\.\([^)]*\w\s*\(/.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
    )
    expect(hits).toEqual([])
  })
})
