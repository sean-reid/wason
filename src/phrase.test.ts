import { describe, expect, it } from 'vitest'
import {
  auditWitnessExplanation,
  multiWitnessExplanation,
  ruleSentence,
  witnessExplanation,
} from './phrase'
import { ABSTRACT, SKINS } from './skins'

const bouncer = SKINS.find((s) => s.id === 'bouncer')!
const log = SKINS.find((s) => s.id === 'log')!
const doors = SKINS.find((s) => s.id === 'doors')!

describe('ruleSentence', () => {
  it('phrases the abstract skin', () => {
    expect(ruleSentence(ABSTRACT, 'if-then', 'vowel', 'even')).toBe(
      'If a card has a vowel, it has an even number.',
    )
    expect(ruleSentence(ABSTRACT, 'iff', 'vowel', 'even')).toBe(
      'A card has a vowel if and only if it has an even number.',
    )
    expect(ruleSentence(ABSTRACT, 'if-then-not', 'vowel', 'prime')).toBe(
      'If a card has a vowel, it does not have a prime number.',
    )
    expect(ruleSentence(ABSTRACT, 'never-adjacent', 'red', 'red')).toBe(
      'A card that has a red side is never next to another that has a red side.',
    )
  })

  it('phrases the bouncer skin', () => {
    expect(ruleSentence(bouncer, 'if-then', 'vowel', 'even')).toBe(
      'If a patron is drinking alcohol, that patron is at least 18.',
    )
    expect(ruleSentence(bouncer, 'unless', 'red', 'even')).toBe(
      'Every patron has a red wristband unless that patron is at least 18.',
    )
  })

  it('phrases the log skin', () => {
    expect(ruleSentence(log, 'if-then', 'even', 'red')).toBe(
      'If a request returned an error, it ran in us-east.',
    )
    expect(ruleSentence(log, 'or', 'odd', 'blue')).toBe(
      'Every request succeeded or ran in eu-west.',
    )
  })

  it('phrases the doors skin', () => {
    expect(ruleSentence(doors, 'right-of', 'red', 'even')).toBe(
      'Every room that has a red door is immediately followed by one that has an even room number.',
    )
    expect(ruleSentence(doors, 'if-not-then', 'vowel', 'prime')).toBe(
      'If a room has no vowel on its nameplate, it has a prime room number.',
    )
  })

  it('throws when a skin cannot phrase a predicate', () => {
    expect(() => ruleSentence(log, 'if-then', 'vowel', 'even')).toThrow('vowel')
  })

  it('every skin phrases every predicate it declares in every form', () => {
    const forms = [
      'if-then',
      'only-if',
      'if-then-not',
      'if-not-then',
      'or',
      'unless',
      'iff',
      'right-of',
      'never-adjacent',
    ] as const
    for (const skin of SKINS) {
      const ids = Object.keys(skin.preds)
      for (const form of forms) {
        for (const a of ids) {
          for (const b of ids) {
            expect(ruleSentence(skin, form, a, b).length).toBeGreaterThan(10)
          }
        }
      }
    }
  })
})

describe('explanations', () => {
  it('uses skin value displays', () => {
    expect(witnessExplanation(ABSTRACT, 'number', 7)).toBe(
      'Required: 7 on the back would break the rule.',
    )
    expect(witnessExplanation(bouncer, 'number', 7)).toBe(
      'Required: 13 on the back would break the rule.',
    )
    expect(witnessExplanation(log, 'color', 'red')).toBe(
      'Required: us-east on the back would break the rule.',
    )
  })

  it('labels faces per skin in multi explanations', () => {
    expect(
      multiWitnessExplanation(bouncer, ['number', 'color'], {
        number: 2,
        color: 'red',
      }),
    ).toBe(
      'Required: both the age and wristband faces (18 with red would break the rule).',
    )
  })

  it('names rules in audit explanations', () => {
    expect(auditWitnessExplanation(ABSTRACT, 'number', 7, [2])).toBe(
      'Required: 7 on the back would break rule 2.',
    )
  })
})
