import { describe, expect, it } from 'vitest'
import { hashSeed } from '../seed'
import {
  FORMS,
  ITEM_COUNT,
  generateBroken,
  generateConnective,
  generateVacuous,
  type Difficulty,
} from './generate'
import { solve } from './solve'

const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3, 4, 5]

describe('generateConnective', () => {
  it('is deterministic for a given seed and difficulty', () => {
    for (const d of DIFFICULTIES) {
      const seed = hashSeed(`wason-2026-08-31-${d}`)
      expect(JSON.stringify(generateConnective(seed, d))).toBe(
        JSON.stringify(generateConnective(seed, d)),
      )
    }
  })

  it('produces distinct puzzles across seeds', () => {
    const puzzles = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((s) =>
        JSON.stringify(generateConnective(hashSeed(`day-${s}`), 3).puzzle),
      ),
    )
    expect(puzzles.size).toBeGreaterThan(6)
  })

  it.each(DIFFICULTIES.map((d) => [d] as const))(
    'meets the quality bar at difficulty %i',
    (difficulty) => {
      for (let s = 0; s < 30; s++) {
        const g = generateConnective(hashSeed(`quality-${s}`), difficulty)
        const n = ITEM_COUNT[difficulty]
        expect(g.puzzle.items).toHaveLength(n)
        expect(FORMS[difficulty]).toContain(g.meta.form)
        expect(g.answer.length).toBeGreaterThanOrEqual(2)
        if (g.meta.form === 'iff') {
          expect(g.answer.length).toBe(n)
        } else {
          expect(g.answer.length).toBeLessThan(n)
        }

        const faces = g.puzzle.items.map(
          (it) => `${it.shown[0]} ${String(it.attrs[it.shown[0]!])}`,
        )
        expect(new Set(faces).size).toBe(n)

        const solution = solve(g.puzzle)
        expect(solution.status).toBe('test')
        expect(solution.unique).toBe(true)
        expect(solution.reveals.map((r) => r.item)).toEqual([...g.answer])
        for (const r of solution.reveals) expect(r.attrs).toHaveLength(1)

        if (g.meta.form !== 'iff') {
          const shownAttrs = new Set(
            g.answer.map((i) => g.puzzle.items[i]!.shown[0]),
          )
          expect(shownAttrs.size).toBe(2)
        }
      }
    },
    30000,
  )
})

describe('generateVacuous', () => {
  it('produces puzzles where no flip is needed', () => {
    for (let s = 0; s < 20; s++) {
      const g = generateVacuous(hashSeed(`vac-${s}`), 3)
      expect(g.meta.kind).toBe('vacuous')
      expect(g.answer).toHaveLength(0)
      const solution = solve(g.puzzle)
      expect(solution.status).toBe('test')
      expect(solution.reveals).toHaveLength(0)
      expect(new Set(g.puzzle.items.map((it) => it.shown[0])).size).toBe(2)
    }
  })

  it('is deterministic', () => {
    const seed = hashSeed('vac-fixed')
    expect(JSON.stringify(generateVacuous(seed, 4))).toBe(
      JSON.stringify(generateVacuous(seed, 4)),
    )
  })
})

describe('generateBroken', () => {
  it('produces puzzles already false from exactly one visible face', () => {
    for (let s = 0; s < 20; s++) {
      const g = generateBroken(hashSeed(`broke-${s}`))
      expect(g.meta.kind).toBe('broken')
      expect(g.answer).toHaveLength(0)
      expect(g.meta.ruleHolds).toBe(false)
      const solution = solve(g.puzzle)
      expect(solution.status).toBe('already-false')
      expect(
        solution.perItem.filter((r) => r.kind === 'always-false'),
      ).toHaveLength(1)
      const hiders = g.puzzle.items.filter(
        (it) => !it.shown.includes(g.meta.a.attr),
      )
      expect(hiders.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('is deterministic', () => {
    const seed = hashSeed('broke-fixed')
    expect(JSON.stringify(generateBroken(seed))).toBe(
      JSON.stringify(generateBroken(seed)),
    )
  })
})
