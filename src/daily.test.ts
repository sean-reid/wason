import { describe, expect, it } from 'vitest'
import {
  DAY_ONE,
  dailyPuzzle,
  difficultyFor,
  isValidDate,
  puzzleNumber,
  trapKind,
  todayLocal,
} from './daily'

describe('puzzleNumber', () => {
  it('starts at 1 on day one', () => {
    expect(puzzleNumber(DAY_ONE)).toBe(1)
    expect(puzzleNumber('2026-09-01')).toBe(2)
    expect(puzzleNumber('2026-10-01')).toBe(32)
  })
})

describe('difficultyFor', () => {
  it('ramps Monday through Sunday', () => {
    expect(difficultyFor('2026-09-07')).toBe(1)
    expect(difficultyFor('2026-09-08')).toBe(2)
    expect(difficultyFor('2026-09-09')).toBe(2)
    expect(difficultyFor('2026-09-10')).toBe(3)
    expect(difficultyFor('2026-09-11')).toBe(3)
    expect(difficultyFor('2026-09-12')).toBe(4)
    expect(difficultyFor('2026-09-13')).toBe(5)
  })
})

describe('isValidDate', () => {
  it('accepts ISO dates and rejects junk', () => {
    expect(isValidDate('2026-09-07')).toBe(true)
    expect(isValidDate('2026-9-7')).toBe(false)
    expect(isValidDate('not-a-date')).toBe(false)
    expect(isValidDate('')).toBe(false)
  })
})

describe('todayLocal', () => {
  it('formats the local date', () => {
    expect(todayLocal(new Date(2026, 8, 7, 12))).toBe('2026-09-07')
    expect(todayLocal(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
})

describe('dailyPuzzle', () => {
  it('is deterministic', () => {
    expect(JSON.stringify(dailyPuzzle('2026-09-07'))).toBe(
      JSON.stringify(dailyPuzzle('2026-09-07')),
    )
  })

  it('generates every day for the next two months', () => {
    for (let offset = 0; offset < 60; offset++) {
      const t = new Date(Date.UTC(2026, 7, 31 + offset))
      const date = t.toISOString().slice(0, 10)
      expect(() => dailyPuzzle(date)).not.toThrow()
    }
  })
})

describe('trapKind', () => {
  it('is deterministic and never lands on a Monday', () => {
    for (let offset = 0; offset < 400; offset++) {
      const t = new Date(Date.UTC(2026, 7, 31 + offset))
      const date = t.toISOString().slice(0, 10)
      expect(trapKind(date)).toBe(trapKind(date))
      if (t.getUTCDay() === 1) expect(trapKind(date)).toBe('standard')
    }
  })

  it('lands traps of both kinds at a modest rate', () => {
    const kinds = { standard: 0, vacuous: 0, broken: 0 }
    for (let offset = 0; offset < 400; offset++) {
      const t = new Date(Date.UTC(2026, 7, 31 + offset))
      kinds[trapKind(t.toISOString().slice(0, 10))]++
    }
    const traps = kinds.vacuous + kinds.broken
    expect(traps).toBeGreaterThan(10)
    expect(traps).toBeLessThan(80)
    expect(kinds.vacuous).toBeGreaterThan(0)
    expect(kinds.broken).toBeGreaterThan(0)
  })

  it('drives dailyPuzzle to the matching generator', () => {
    for (let offset = 0; offset < 120; offset++) {
      const t = new Date(Date.UTC(2026, 7, 31 + offset))
      const date = t.toISOString().slice(0, 10)
      expect(dailyPuzzle(date).meta.kind).toBe(trapKind(date))
    }
  })
})
