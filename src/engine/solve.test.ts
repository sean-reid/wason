import { describe, expect, it } from 'vitest'
import { hashSeed } from '../seed'
import {
  generateAudit,
  generateConnective,
  generateMultiAttr,
  type Difficulty,
} from './generate'
import { evalProp } from './rule'
import { completions, solve } from './solve'
import type { AttributeDef, ItemProp, Pred, Puzzle, Rule } from './types'

function propOf(rule: Rule): ItemProp {
  if (rule.kind !== 'every-item') throw new Error('itemwise rules only')
  return rule.prop
}

const letter: AttributeDef = {
  id: 'letter',
  domain: ['A', 'E', 'I', 'U', 'B', 'K', 'R', 'T'],
}
const number: AttributeDef = { id: 'number', domain: [1, 2, 3, 4, 5, 6, 7, 8] }
const vowel: Pred = {
  id: 'vowel',
  attr: 'letter',
  values: ['A', 'E', 'I', 'U'],
}
const even: Pred = { id: 'even', attr: 'number', values: [2, 4, 6, 8] }
const P = (pred: Pred): ItemProp => ({ kind: 'pred', pred })

function card(shown: 'letter' | 'number', l: string, n: number) {
  return { attrs: { letter: l, number: n }, shown: [shown] }
}

describe('solve', () => {
  it('solves the classic Wason selection task', () => {
    const puzzle: Puzzle = {
      attributes: [letter, number],
      items: [
        card('letter', 'E', 4),
        card('letter', 'K', 2),
        card('number', 'A', 4),
        card('number', 'B', 7),
      ],
      rule: {
        kind: 'every-item',
        prop: { kind: 'implies', ante: P(vowel), cons: P(even) },
      },
    }
    const s = solve(puzzle)
    expect(s.status).toBe('test')
    expect(s.unique).toBe(true)
    expect(s.reveals).toEqual([
      { item: 0, attrs: ['number'] },
      { item: 3, attrs: ['letter'] },
    ])
    expect(s.perItem[1]!.kind).toBe('always-true')
    expect(s.perItem[2]!.kind).toBe('always-true')
    expect(s.perItem[0]!.witness).toMatchObject({ letter: 'E' })
    expect(evalProp(propOf(puzzle.rule), s.perItem[0]!.witness!)).toBe(false)
  })

  it('reports a rule already false from a visible face', () => {
    const puzzle: Puzzle = {
      attributes: [letter, number],
      items: [card('number', 'A', 7), card('letter', 'E', 2)],
      rule: { kind: 'every-item', prop: P(even) },
    }
    const s = solve(puzzle)
    expect(s.status).toBe('already-false')
    expect(s.reveals).toEqual([])
  })

  it('returns no reveals when the rule is vacuously safe', () => {
    const puzzle: Puzzle = {
      attributes: [letter, number],
      items: [card('letter', 'K', 1), card('letter', 'B', 2)],
      rule: {
        kind: 'every-item',
        prop: { kind: 'implies', ante: P(vowel), cons: P(even) },
      },
    }
    const s = solve(puzzle)
    expect(s.status).toBe('test')
    expect(s.reveals).toEqual([])
  })
})

interface WorldTable {
  sizes: number[]
  strides: number[]
  count: number
  truth: Uint8Array
}

function buildWorlds(puzzle: Puzzle): WorldTable {
  const per = puzzle.items.map((it) => completions(it, puzzle.attributes))
  const truthPer = per.map((comps) =>
    comps.map((c) => evalProp(propOf(puzzle.rule), c)),
  )
  const sizes = per.map((c) => c.length)
  const strides = sizes.map((_, i) =>
    sizes.slice(0, i).reduce((x, y) => x * y, 1),
  )
  const count = sizes.reduce((x, y) => x * y, 1)
  const truth = new Uint8Array(count)
  for (let w = 0; w < count; w++) {
    let t = 1
    for (let i = 0; i < sizes.length; i++) {
      if (!truthPer[i]![Math.floor(w / strides[i]!) % sizes[i]!]) {
        t = 0
        break
      }
    }
    truth[w] = t
  }
  return { sizes, strides, count, truth }
}

function naiveSufficient(
  world: WorldTable,
  revealed: readonly number[],
): boolean {
  const subStrides: number[] = []
  let acc = 1
  for (const i of revealed) {
    subStrides.push(acc)
    acc *= world.sizes[i]!
  }
  const seen = new Map<number, number>()
  for (let w = 0; w < world.count; w++) {
    let key = 0
    for (let k = 0; k < revealed.length; k++) {
      const i = revealed[k]!
      key +=
        (Math.floor(w / world.strides[i]!) % world.sizes[i]!) * subStrides[k]!
    }
    const t = world.truth[w]!
    const prev = seen.get(key)
    if (prev === undefined) seen.set(key, t)
    else if (prev !== t) return false
  }
  return true
}

describe('solver agrees with a naive subset search', () => {
  const cases: [Difficulty, number][] = ([1, 2, 3, 4, 5] as const).flatMap(
    (d) => [11, 23, 47].map((s): [Difficulty, number] => [d, s]),
  )

  it.each(cases)(
    'difficulty %i, seed %i',
    (difficulty, seed) => {
      const g = generateConnective(hashSeed(`cross-check-${seed}`), difficulty)
      const world = buildWorlds(g.puzzle)
      const answer = [...g.answer].sort((a, b) => a - b)
      expect(naiveSufficient(world, answer)).toBe(true)

      const n = g.puzzle.items.length
      for (let mask = 0; mask < 1 << n; mask++) {
        const subset: number[] = []
        for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(i)
        if (subset.length > answer.length) continue
        if (subset.join(',') === answer.join(',')) continue
        expect(
          naiveSufficient(world, subset),
          `subset ${subset.join(',')}`,
        ).toBe(false)
      }
    },
    30000,
  )
})

describe('solve on relational rules', () => {
  const color: AttributeDef = {
    id: 'color',
    domain: ['red', 'blue', 'green', 'yellow'],
  }
  const red: Pred = { id: 'red', attr: 'color', values: ['red'] }

  it('requires exactly the coupled pair for a right-of rule', () => {
    const puzzle: Puzzle = {
      attributes: [letter, number],
      items: [
        card('letter', 'E', 4),
        card('number', 'A', 4),
        card('letter', 'K', 7),
      ],
      rule: { kind: 'adjacent', variant: 'right-of', a: vowel, b: even },
    }
    const s = solve(puzzle)
    expect(s.status).toBe('test')
    expect(s.unique).toBe(true)
    expect(s.reveals.map((r) => r.item)).toEqual([1, 2])
    expect(s.perItem[0]!.kind).toBe('always-true')
  })

  it('reports an adjacency already broken by visible faces', () => {
    const puzzle: Puzzle = {
      attributes: [color, letter],
      items: [
        { attrs: { color: 'red', letter: 'A' }, shown: ['color'] },
        { attrs: { color: 'red', letter: 'K' }, shown: ['color'] },
        { attrs: { color: 'blue', letter: 'E' }, shown: ['letter'] },
      ],
      rule: { kind: 'adjacent', variant: 'never-adjacent', a: red, b: red },
    }
    const s = solve(puzzle)
    expect(s.status).toBe('already-false')
  })

  it('treats an antecedent match in the last position as breakable', () => {
    // The rightmost card has no follower, so a match there falsifies the rule.
    const puzzle: Puzzle = {
      attributes: [letter, number],
      items: [card('letter', 'K', 2), card('number', 'A', 4)],
      rule: { kind: 'adjacent', variant: 'right-of', a: vowel, b: even },
    }
    const s = solve(puzzle)
    expect(s.status).toBe('test')
    expect(s.reveals).toEqual([{ item: 1, attrs: ['letter'] }])
  })

  it('returns no reveals when no card can match the antecedent', () => {
    const puzzle: Puzzle = {
      attributes: [letter, number],
      items: [
        card('letter', 'K', 1),
        card('letter', 'B', 2),
        card('letter', 'T', 3),
      ],
      rule: { kind: 'adjacent', variant: 'right-of', a: vowel, b: even },
    }
    const s = solve(puzzle)
    expect(s.status).toBe('test')
    expect(s.reveals).toEqual([])
  })
})

describe('audit answers agree with the naive subset search', () => {
  it.each([[5], [17], [29]])(
    'audit seed %i',
    (seed) => {
      const g = generateAudit(hashSeed(`audit-cross-${seed}`))
      const world = buildWorlds(g.puzzle)
      const answer = [...g.answer].sort((a, b) => a - b)
      expect(naiveSufficient(world, answer)).toBe(true)
      const n = g.puzzle.items.length
      for (let mask = 0; mask < 1 << n; mask++) {
        const subset: number[] = []
        for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(i)
        if (subset.length > answer.length) continue
        if (subset.join(',') === answer.join(',')) continue
        expect(
          naiveSufficient(world, subset),
          `subset ${subset.join(',')}`,
        ).toBe(false)
      }
    },
    60000,
  )
})

describe('multi-attribute answers agree with a pair-level subset search', () => {
  type Pair = readonly [number, string]

  function naivePairSufficient(
    puzzle: Puzzle,
    pairs: readonly Pair[],
  ): boolean {
    const per = puzzle.items.map((it) => completions(it, puzzle.attributes))
    const truths = per.map((comps) =>
      comps.map((c) => evalProp(propOf(puzzle.rule), c)),
    )
    const idx = puzzle.items.map(() => 0)
    const seen = new Map<string, boolean>()
    for (;;) {
      let ruleTruth = true
      for (let i = 0; i < idx.length; i++) {
        if (!truths[i]![idx[i]!]) {
          ruleTruth = false
          break
        }
      }
      const key = pairs.map(([i, a]) => String(per[i]![idx[i]!]![a])).join('|')
      const prev = seen.get(key)
      if (prev === undefined) seen.set(key, ruleTruth)
      else if (prev !== ruleTruth) return false
      let i = 0
      for (; i < idx.length; i++) {
        idx[i] = idx[i]! + 1
        if (idx[i]! < per[i]!.length) break
        idx[i] = 0
      }
      if (i === idx.length) return true
    }
  }

  it.each([[1], [2], [3]])(
    'multi seed %i',
    (seed) => {
      const g = generateMultiAttr(hashSeed(`multi-pair-${seed}`))
      const answerPairs: Pair[] = g.solution.reveals.flatMap((r) =>
        r.attrs.map((a) => [r.item, a] as const),
      )
      expect(naivePairSufficient(g.puzzle, answerPairs)).toBe(true)
      for (let drop = 0; drop < answerPairs.length; drop++) {
        const subset = answerPairs.filter((_, k) => k !== drop)
        expect(naivePairSufficient(g.puzzle, subset), `dropped ${drop}`).toBe(
          false,
        )
      }
    },
    120000,
  )
})
