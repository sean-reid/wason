import type { RuleForm } from './engine/generate'
import type { AttrValue } from './engine/types'

const PRED_PHRASES: Record<string, string> = {
  vowel: 'a vowel',
  consonant: 'a consonant',
  even: 'an even number',
  odd: 'an odd number',
  prime: 'a prime number',
  red: 'a red side',
  blue: 'a blue side',
}

export function predPhrase(predId: string): string {
  const phrase = PRED_PHRASES[predId]
  if (!phrase) throw new Error(`no phrase for predicate ${predId}`)
  return phrase
}

export function ruleSentence(form: RuleForm, aId: string, bId: string): string {
  const a = predPhrase(aId)
  const b = predPhrase(bId)
  switch (form) {
    case 'if-then':
      return `If a card has ${a} on one side, it has ${b} on the other.`
    case 'only-if':
      return `A card has ${a} on one side only if it has ${b} on the other.`
    case 'if-then-not':
      return `If a card has ${a} on one side, it does not have ${b} on the other.`
    case 'if-not-then':
      return `If a card does not have ${a} on one side, it has ${b} on the other.`
    case 'or':
      return `Every card has ${a} or ${b}.`
    case 'unless':
      return `Every card has ${a} unless it has ${b}.`
    case 'iff':
      return `A card has ${a} if and only if it has ${b}.`
  }
}

export function faceText(value: AttrValue): string {
  return String(value)
}

export function witnessExplanation(attrId: string, value: AttrValue): string {
  const face =
    attrId === 'color'
      ? `a ${String(value)} back`
      : `${String(value)} on the back`
  return `Required: ${face} would break the rule.`
}

export const INERT_EXPLANATION = 'Safe: nothing on the back can break the rule.'

export const BROKEN_FACE_EXPLANATION =
  'Breaks the rule face-up. No flip needed.'

export const IRRELEVANT_EXPLANATION = 'Irrelevant: the rule was already broken.'
