import { describe, expect, it } from 'vitest'
import { hashSeed } from '../seed'
import {
  FORMS,
  ITEM_COUNT,
  generateConnective,
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
