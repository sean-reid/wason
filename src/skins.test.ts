import { describe, expect, it } from 'vitest'
import { dailyPuzzle } from './daily'
import { ABSTRACT, SKINS, covers, displayValue, skinFor } from './skins'
import { PREDS } from './engine/generate'

describe('skinFor', () => {
  it('always returns a skin that covers the day', () => {
    for (let offset = 0; offset < 90; offset++) {
      const t = new Date(Date.UTC(2026, 7, 31 + offset))
      const date = t.toISOString().slice(0, 10)
      const gen = dailyPuzzle(date)
      const skin = skinFor(date, gen)
      expect(covers(skin, gen)).toBe(true)
    }
  })

  it('is deterministic', () => {
    const gen = dailyPuzzle('2026-09-07')
    expect(skinFor('2026-09-07', gen).id).toBe(skinFor('2026-09-07', gen).id)
  })

  it('serves themed skins on their weekdays at least sometimes', () => {
    const seen = new Set<string>()
    for (let offset = 0; offset < 120; offset++) {
      const t = new Date(Date.UTC(2026, 7, 31 + offset))
      const date = t.toISOString().slice(0, 10)
      seen.add(skinFor(date, dailyPuzzle(date)).id)
    }
    expect(seen.has('bouncer')).toBe(true)
    expect(seen.has('doors')).toBe(true)
    expect(seen.has('abstract')).toBe(true)
  })
})

describe('covers', () => {
  it('abstract covers every generator predicate', () => {
    for (const p of PREDS) expect(p.id in ABSTRACT.preds).toBe(true)
  })

  it('bouncer does not cover prime rules', () => {
    const bouncer = SKINS.find((s) => s.id === 'bouncer')!
    expect('prime' in bouncer.preds).toBe(false)
  })
})

describe('displayValue', () => {
  it('maps declared values and passes unknown ones through', () => {
    const bouncer = SKINS.find((s) => s.id === 'bouncer')!
    expect(displayValue(bouncer, 'letter', 'A')).toBe('beer')
    expect(displayValue(bouncer, 'number', 8)).toBe('30')
    expect(displayValue(bouncer, 'color', 'red')).toBe('red')
    expect(displayValue(ABSTRACT, 'letter', 'K')).toBe('K')
  })

  it('every skin maps the full domain of attributes it relabels with values', () => {
    const log = SKINS.find((s) => s.id === 'log')!
    for (const v of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(displayValue(log, 'number', v)).not.toBe(String(v))
    }
    for (const c of ['red', 'blue', 'green', 'yellow']) {
      expect(displayValue(log, 'color', c)).not.toBe(c)
    }
  })
})
