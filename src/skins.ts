import { weekdayOf } from './daily'
import type { GeneratedPuzzle, RuleSpec } from './engine/generate'
import type { AttrValue } from './engine/types'

export interface PredVoice {
  vp: string
  neg: string
}

export interface Skin {
  id: 'abstract' | 'bouncer' | 'log' | 'doors'
  accent: string
  noun: string
  pronoun: string
  attrLabels: Readonly<Record<string, string>>
  preds: Readonly<Record<string, PredVoice>>
  values: Readonly<Record<string, Readonly<Record<string, string>>>>
  swatchAttrs: readonly string[]
}

export const ABSTRACT: Skin = {
  id: 'abstract',
  accent: '',
  noun: 'card',
  pronoun: 'it',
  attrLabels: { letter: 'letter', number: 'number', color: 'color' },
  preds: {
    vowel: { vp: 'has a vowel', neg: 'does not have a vowel' },
    consonant: { vp: 'has a consonant', neg: 'does not have a consonant' },
    even: { vp: 'has an even number', neg: 'has an odd number' },
    odd: { vp: 'has an odd number', neg: 'has an even number' },
    prime: { vp: 'has a prime number', neg: 'does not have a prime number' },
    red: { vp: 'has a red side', neg: 'does not have a red side' },
    blue: { vp: 'has a blue side', neg: 'does not have a blue side' },
  },
  values: {},
  swatchAttrs: ['color'],
}

const BOUNCER: Skin = {
  id: 'bouncer',
  accent: '#b3540e',
  noun: 'patron',
  pronoun: 'that patron',
  attrLabels: { letter: 'drink', number: 'age', color: 'wristband' },
  preds: {
    vowel: { vp: 'is drinking alcohol', neg: 'is not drinking alcohol' },
    consonant: { vp: 'is drinking a soft drink', neg: 'is drinking alcohol' },
    even: { vp: 'is at least 18', neg: 'is under 18' },
    odd: { vp: 'is under 18', neg: 'is at least 18' },
    red: { vp: 'has a red wristband', neg: 'does not have a red wristband' },
    blue: { vp: 'has a blue wristband', neg: 'does not have a blue wristband' },
  },
  values: {
    letter: {
      A: 'beer',
      E: 'wine',
      I: 'whisky',
      U: 'cider',
      B: 'cola',
      K: 'cocoa',
      R: 'juice',
      T: 'tea',
    },
    number: {
      1: '15',
      2: '18',
      3: '16',
      4: '20',
      5: '17',
      6: '22',
      7: '13',
      8: '30',
    },
  },
  swatchAttrs: ['color'],
}

const LOG: Skin = {
  id: 'log',
  accent: '#2e7d4f',
  noun: 'request',
  pronoun: 'it',
  attrLabels: { number: 'status', color: 'region' },
  preds: {
    even: { vp: 'returned an error', neg: 'succeeded' },
    odd: { vp: 'succeeded', neg: 'returned an error' },
    red: { vp: 'ran in us-east', neg: 'did not run in us-east' },
    blue: { vp: 'ran in eu-west', neg: 'did not run in eu-west' },
  },
  values: {
    number: {
      1: '200',
      2: '500',
      3: '201',
      4: '404',
      5: '204',
      6: '502',
      7: '202',
      8: '503',
    },
    color: {
      red: 'us-east',
      blue: 'eu-west',
      green: 'ap-south',
      yellow: 'us-west',
    },
  },
  swatchAttrs: [],
}

const DOORS: Skin = {
  id: 'doors',
  accent: '#2f5fe0',
  noun: 'room',
  pronoun: 'it',
  attrLabels: { letter: 'nameplate', number: 'number', color: 'door' },
  preds: {
    vowel: {
      vp: 'has a vowel on its nameplate',
      neg: 'has no vowel on its nameplate',
    },
    consonant: {
      vp: 'has a consonant on its nameplate',
      neg: 'has a vowel on its nameplate',
    },
    even: { vp: 'has an even room number', neg: 'has an odd room number' },
    odd: { vp: 'has an odd room number', neg: 'has an even room number' },
    prime: {
      vp: 'has a prime room number',
      neg: 'does not have a prime room number',
    },
    red: { vp: 'has a red door', neg: 'does not have a red door' },
    blue: { vp: 'has a blue door', neg: 'does not have a blue door' },
  },
  values: {},
  swatchAttrs: ['color'],
}

export const SKINS: readonly Skin[] = [ABSTRACT, BOUNCER, LOG, DOORS]

const SKIN_BY_WEEKDAY: Readonly<Record<number, Skin>> = {
  1: BOUNCER,
  2: LOG,
  3: DOORS,
  4: BOUNCER,
  5: DOORS,
  6: ABSTRACT,
  0: ABSTRACT,
}

function specsOf(gen: GeneratedPuzzle): readonly RuleSpec[] {
  return (
    gen.meta.rules ?? [
      { form: gen.meta.form as RuleSpec['form'], a: gen.meta.a, b: gen.meta.b },
    ]
  )
}

export function covers(skin: Skin, gen: GeneratedPuzzle): boolean {
  const predsUsed = specsOf(gen).flatMap((s) => [s.a.id, s.b.id])
  if (!predsUsed.every((id) => id in skin.preds)) return false
  return gen.puzzle.attributes.every((a) => a.id in skin.attrLabels)
}

export function skinFor(date: string, gen: GeneratedPuzzle): Skin {
  const preferred = SKIN_BY_WEEKDAY[weekdayOf(date)]!
  return covers(preferred, gen) ? preferred : ABSTRACT
}

export function displayValue(
  skin: Skin,
  attrId: string,
  value: AttrValue,
): string {
  return skin.values[attrId]?.[String(value)] ?? String(value)
}
