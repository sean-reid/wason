import { describe, expect, it } from 'vitest'
import { evalProp } from './rule'
import type { ItemProp } from './types'
import { hashSeed } from '../seed'
import {
  FORMS,
  ITEM_COUNT,
  generateBroken,
  generateAudit,
  generateConnective,
  generateMultiAttr,
  generateRelational,
  generateVacuous,
  type Difficulty,
} from './generate'
import { completions, solve } from './solve'

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

describe('generateMultiAttr', () => {
  it('needs face-level picks with both single and double reveals', () => {
    for (let s = 0; s < 15; s++) {
      const g = generateMultiAttr(hashSeed(`multi-${s}`))
      expect(g.meta.kind).toBe('multi')
      const solution = solve(g.puzzle)
      expect(solution.status).toBe('test')
      expect(solution.unique).toBe(true)
      expect(solution.reveals.some((r) => r.attrs.length === 1)).toBe(true)
      expect(solution.reveals.some((r) => r.attrs.length === 2)).toBe(true)
      const pairs = solution.reveals.reduce((sum, r) => sum + r.attrs.length, 0)
      expect(pairs).toBeGreaterThanOrEqual(3)
      expect(pairs).toBeLessThanOrEqual(6)
      for (const it of g.puzzle.items)
        expect(Object.keys(it.attrs)).toHaveLength(3)
    }
  })

  it('is deterministic', () => {
    const seed = hashSeed('multi-fixed')
    expect(JSON.stringify(generateMultiAttr(seed))).toBe(
      JSON.stringify(generateMultiAttr(seed)),
    )
  })
})

describe('generateAudit', () => {
  it('produces two distinct rules with overlap and exclusive threats', () => {
    for (let s = 0; s < 15; s++) {
      const g = generateAudit(hashSeed(`audit-${s}`))
      expect(g.meta.kind).toBe('audit')
      expect(g.meta.rules).toHaveLength(2)
      const [p1, p2] = (
        g.puzzle.rule as {
          kind: 'every-item'
          prop: { kind: 'and'; of: ItemProp[] }
        }
      ).prop.of
      expect(JSON.stringify(p1)).not.toBe(JSON.stringify(p2))
      const solution = solve(g.puzzle)
      expect(solution.status).toBe('test')
      expect(solution.unique).toBe(true)
      expect(g.answer.length).toBeGreaterThanOrEqual(3)
      expect(g.answer.length).toBeLessThan(g.puzzle.items.length)
      const breakSets = g.answer.map((i) => {
        const comps = completions(g.puzzle.items[i]!, g.puzzle.attributes)
        return [p1!, p2!].map((p) => comps.some((c) => !evalProp(p, c)))
      })
      expect(breakSets.some(([a, b]) => a && b)).toBe(true)
      expect(breakSets.some(([a, b]) => a && !b)).toBe(true)
      expect(breakSets.some(([a, b]) => !a && b)).toBe(true)
    }
  })

  it('is deterministic', () => {
    const seed = hashSeed('audit-fixed')
    expect(JSON.stringify(generateAudit(seed))).toBe(
      JSON.stringify(generateAudit(seed)),
    )
  })
})

describe('generateRelational', () => {
  it('produces unique answers on neighbor-coupled rules', () => {
    for (let s = 0; s < 10; s++) {
      const g = generateRelational(hashSeed(`rel-${s}`))
      expect(g.meta.kind).toBe('relational')
      expect(g.puzzle.rule.kind).toBe('adjacent')
      const solution = solve(g.puzzle)
      expect(solution.status).toBe('test')
      expect(solution.unique).toBe(true)
      expect(g.answer.length).toBeGreaterThanOrEqual(2)
      expect(g.answer.length).toBeLessThanOrEqual(4)
      expect(g.answer.length).toBeLessThan(g.puzzle.items.length)
    }
  }, 60000)

  it('is deterministic', () => {
    const seed = hashSeed('rel-fixed')
    expect(JSON.stringify(generateRelational(seed))).toBe(
      JSON.stringify(generateRelational(seed)),
    )
  })
})
