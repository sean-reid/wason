import { describe, expect, it } from 'vitest'
import { evalProp, evalRule } from './rule'
import type { ItemProp, Pred } from './types'

const vowel: Pred = { id: 'vowel', attr: 'letter', values: ['A', 'E'] }
const even: Pred = { id: 'even', attr: 'number', values: [2, 4] }
const P = (pred: Pred): ItemProp => ({ kind: 'pred', pred })

describe('evalProp', () => {
  it('evaluates predicates', () => {
    expect(evalProp(P(vowel), { letter: 'A' })).toBe(true)
    expect(evalProp(P(vowel), { letter: 'K' })).toBe(false)
  })

  it('throws on a missing attribute', () => {
    expect(() => evalProp(P(vowel), { number: 2 })).toThrow('letter')
  })

  it('evaluates not', () => {
    expect(evalProp({ kind: 'not', of: P(vowel) }, { letter: 'K' })).toBe(true)
    expect(evalProp({ kind: 'not', of: P(vowel) }, { letter: 'A' })).toBe(false)
  })

  it.each([
    ['A', 2, true],
    ['A', 3, false],
    ['K', 2, false],
    ['K', 3, false],
  ])('and: %s %i is %s', (letter, number, want) => {
    expect(
      evalProp({ kind: 'and', of: [P(vowel), P(even)] }, { letter, number }),
    ).toBe(want)
  })

  it.each([
    ['A', 2, true],
    ['A', 3, true],
    ['K', 2, true],
    ['K', 3, false],
  ])('or: %s %i is %s', (letter, number, want) => {
    expect(
      evalProp({ kind: 'or', of: [P(vowel), P(even)] }, { letter, number }),
    ).toBe(want)
  })

  it.each([
    ['A', 2, true],
    ['A', 3, false],
    ['K', 2, true],
    ['K', 3, true],
  ])('implies: %s %i is %s', (letter, number, want) => {
    expect(
      evalProp(
        { kind: 'implies', ante: P(vowel), cons: P(even) },
        { letter, number },
      ),
    ).toBe(want)
  })

  it.each([
    ['A', 2, true],
    ['A', 3, false],
    ['K', 2, false],
    ['K', 3, true],
  ])('iff: %s %i is %s', (letter, number, want) => {
    expect(
      evalProp({ kind: 'iff', a: P(vowel), b: P(even) }, { letter, number }),
    ).toBe(want)
  })
})

describe('evalRule', () => {
  it('quantifies over every item', () => {
    const rule = {
      kind: 'every-item' as const,
      prop: { kind: 'implies' as const, ante: P(vowel), cons: P(even) },
    }
    expect(
      evalRule(rule, [
        { letter: 'A', number: 2 },
        { letter: 'K', number: 3 },
      ]),
    ).toBe(true)
    expect(
      evalRule(rule, [
        { letter: 'A', number: 3 },
        { letter: 'K', number: 2 },
      ]),
    ).toBe(false)
  })
})

describe('evalRule on adjacent rules', () => {
  const red: Pred = { id: 'red', attr: 'color', values: ['red'] }
  const blue: Pred = { id: 'blue', attr: 'color', values: ['blue'] }

  it('right-of holds when every match has the right neighbor', () => {
    const rule = {
      kind: 'adjacent' as const,
      variant: 'right-of' as const,
      a: vowel,
      b: even,
    }
    expect(
      evalRule(rule, [
        { letter: 'A', number: 3 },
        { letter: 'K', number: 2 },
      ]),
    ).toBe(true)
    expect(
      evalRule(rule, [
        { letter: 'A', number: 3 },
        { letter: 'K', number: 3 },
      ]),
    ).toBe(false)
  })

  it('right-of fails for a match in the last position', () => {
    const rule = {
      kind: 'adjacent' as const,
      variant: 'right-of' as const,
      a: vowel,
      b: even,
    }
    expect(
      evalRule(rule, [
        { letter: 'K', number: 2 },
        { letter: 'A', number: 2 },
      ]),
    ).toBe(false)
  })

  it('never-adjacent is symmetric', () => {
    const rule = {
      kind: 'adjacent' as const,
      variant: 'never-adjacent' as const,
      a: red,
      b: blue,
    }
    expect(
      evalRule(rule, [{ color: 'red' }, { color: 'green' }, { color: 'blue' }]),
    ).toBe(true)
    expect(evalRule(rule, [{ color: 'red' }, { color: 'blue' }])).toBe(false)
    expect(evalRule(rule, [{ color: 'blue' }, { color: 'red' }])).toBe(false)
  })

  it('never-adjacent with equal predicates bans pairs', () => {
    const rule = {
      kind: 'adjacent' as const,
      variant: 'never-adjacent' as const,
      a: red,
      b: red,
    }
    expect(
      evalRule(rule, [{ color: 'red' }, { color: 'blue' }, { color: 'red' }]),
    ).toBe(true)
    expect(
      evalRule(rule, [{ color: 'blue' }, { color: 'red' }, { color: 'red' }]),
    ).toBe(false)
  })
})
