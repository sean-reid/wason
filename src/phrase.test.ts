import { describe, expect, it } from 'vitest'
import { predPhrase, ruleSentence, witnessExplanation } from './phrase'

describe('ruleSentence', () => {
  it('phrases each rule form', () => {
    expect(ruleSentence('if-then', 'vowel', 'even')).toBe(
      'If a card has a vowel on one side, it has an even number on the other.',
    )
    expect(ruleSentence('only-if', 'vowel', 'even')).toBe(
      'A card has a vowel on one side only if it has an even number on the other.',
    )
    expect(ruleSentence('if-then-not', 'vowel', 'prime')).toBe(
      'If a card has a vowel on one side, it does not have a prime number on the other.',
    )
    expect(ruleSentence('if-not-then', 'red', 'odd')).toBe(
      'If a card does not have a red side on one side, it has an odd number on the other.',
    )
    expect(ruleSentence('or', 'vowel', 'even')).toBe(
      'Every card has a vowel or an even number.',
    )
    expect(ruleSentence('unless', 'red', 'prime')).toBe(
      'Every card has a red side unless it has a prime number.',
    )
    expect(ruleSentence('iff', 'vowel', 'even')).toBe(
      'A card has a vowel if and only if it has an even number.',
    )
  })
})

describe('predPhrase', () => {
  it('throws on an unknown predicate', () => {
    expect(() => predPhrase('sparkly')).toThrow('sparkly')
  })
})

describe('witnessExplanation', () => {
  it('describes the breaking back face', () => {
    expect(witnessExplanation('number', 7)).toBe(
      'Required: 7 on the back would break the rule.',
    )
    expect(witnessExplanation('color', 'red')).toBe(
      'Required: a red back would break the rule.',
    )
  })
})
