import type { AttributeDef, Item, ItemProp, Pred } from './types'

export type RuleForm =
  | 'if-then'
  | 'only-if'
  | 'if-then-not'
  | 'if-not-then'
  | 'or'
  | 'unless'
  | 'iff'

export type RelationalForm = 'right-of' | 'never-adjacent'

export type Difficulty = 1 | 2 | 3 | 4 | 5

export interface RuleSpec {
  form: RuleForm
  a: Pred
  b: Pred
}

export const ATTRIBUTES: readonly AttributeDef[] = [
  { id: 'letter', domain: ['A', 'E', 'I', 'U', 'B', 'K', 'R', 'T'] },
  { id: 'number', domain: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: 'color', domain: ['red', 'blue', 'green', 'yellow'] },
]

export const PREDS: readonly Pred[] = [
  { id: 'vowel', attr: 'letter', values: ['A', 'E', 'I', 'U'] },
  { id: 'consonant', attr: 'letter', values: ['B', 'K', 'R', 'T'] },
  { id: 'even', attr: 'number', values: [2, 4, 6, 8] },
  { id: 'odd', attr: 'number', values: [1, 3, 5, 7] },
  { id: 'prime', attr: 'number', values: [2, 3, 5, 7] },
  { id: 'red', attr: 'color', values: ['red'] },
  { id: 'blue', attr: 'color', values: ['blue'] },
]

export const FORMS: Record<Difficulty, readonly RuleForm[]> = {
  1: ['if-then'],
  2: ['if-then', 'if-then-not', 'only-if'],
  3: ['or', 'unless', 'if-then-not'],
  4: ['iff', 'or', 'if-not-then'],
  5: ['iff', 'if-not-then', 'unless'],
}

export const ITEM_COUNT: Record<Difficulty, number> = {
  1: 4,
  2: 4,
  3: 5,
  4: 5,
  5: 6,
}

export const IMPLIES_FORMS: readonly RuleForm[] = [
  'if-then',
  'only-if',
  'if-then-not',
  'if-not-then',
]

export function buildProp(form: RuleForm, a: Pred, b: Pred): ItemProp {
  const P = (pred: Pred): ItemProp => ({ kind: 'pred', pred })
  switch (form) {
    case 'if-then':
    case 'only-if':
      return { kind: 'implies', ante: P(a), cons: P(b) }
    case 'if-then-not':
      return { kind: 'implies', ante: P(a), cons: { kind: 'not', of: P(b) } }
    case 'if-not-then':
      return { kind: 'implies', ante: { kind: 'not', of: P(a) }, cons: P(b) }
    case 'or':
    case 'unless':
      return { kind: 'or', of: [P(a), P(b)] }
    case 'iff':
      return { kind: 'iff', a: P(a), b: P(b) }
  }
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

// Two-attribute items, one shown, no duplicate visible faces, and the first
// two items keep both sides of the rule represented among the visible faces.
export function sampleItems(
  rng: () => number,
  attributes: readonly AttributeDef[],
  n: number,
): Item[] | undefined {
  const items: Item[] = []
  const usedFaces = new Set<string>()
  for (let i = 0; i < n; i++) {
    const shownAttr = i < 2 ? attributes[i % 2]! : pick(rng, attributes)
    const hiddenAttr = attributes.find((x) => x.id !== shownAttr.id)!
    const shownValue = pick(rng, shownAttr.domain)
    const face = `${shownAttr.id} ${String(shownValue)}`
    if (usedFaces.has(face)) return undefined
    usedFaces.add(face)
    items.push({
      attrs: {
        [shownAttr.id]: shownValue,
        [hiddenAttr.id]: pick(rng, hiddenAttr.domain),
      },
      shown: [shownAttr.id],
    })
  }
  return items
}
