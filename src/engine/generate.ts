import { mulberry32 } from '../seed'
import { evalRule } from './rule'
import { solve } from './solve'
import type { AttributeDef, Item, ItemProp, Pred, Puzzle } from './types'

export type RuleForm =
  | 'if-then'
  | 'only-if'
  | 'if-then-not'
  | 'if-not-then'
  | 'or'
  | 'unless'
  | 'iff'

export type Difficulty = 1 | 2 | 3 | 4 | 5

export interface GeneratedPuzzle {
  puzzle: Puzzle
  answer: readonly number[]
  meta: {
    difficulty: Difficulty
    form: RuleForm
    a: Pred
    b: Pred
    ruleHolds: boolean
  }
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

const IMPLIES_FORMS: readonly RuleForm[] = [
  'if-then',
  'only-if',
  'if-then-not',
  'if-not-then',
]

function buildProp(form: RuleForm, a: Pred, b: Pred): ItemProp {
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

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

export function generateConnective(
  seed: number,
  difficulty: Difficulty,
): GeneratedPuzzle {
  const rng = mulberry32(seed)
  for (let attempt = 0; attempt < 2000; attempt++) {
    const candidate = tryGenerate(rng, difficulty)
    if (candidate) return candidate
  }
  throw new Error(
    `no acceptable puzzle for seed ${seed} at difficulty ${difficulty}`,
  )
}

function tryGenerate(
  rng: () => number,
  difficulty: Difficulty,
): GeneratedPuzzle | undefined {
  const form = pick(rng, FORMS[difficulty])
  const a = pick(rng, PREDS)
  const b = pick(
    rng,
    PREDS.filter((p) => p.attr !== a.attr),
  )
  const attributes = ATTRIBUTES.filter(
    (x) => x.id === a.attr || x.id === b.attr,
  )
  const n = ITEM_COUNT[difficulty]

  const items: Item[] = []
  const usedFaces = new Set<string>()
  for (let i = 0; i < n; i++) {
    // Keep both sides of the rule represented among the visible faces.
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

  const puzzle: Puzzle = {
    attributes,
    items,
    rule: { kind: 'every-item', prop: buildProp(form, a, b) },
  }
  const solution = solve(puzzle)
  if (solution.status !== 'test' || !solution.unique) return undefined

  const answer = solution.reveals.map((r) => r.item)
  const contingent = new Set(answer)
  if (answer.length < 2) return undefined
  if (form === 'iff') {
    if (answer.length !== n) return undefined
  } else {
    if (answer.length >= n) return undefined
  }
  if (IMPLIES_FORMS.includes(form) || form === 'or' || form === 'unless') {
    const shownAttrOf = (i: number) => items[i]!.shown[0]!
    const attrsAmongAnswer = new Set(answer.map(shownAttrOf))
    if (attrsAmongAnswer.size < 2) return undefined
    const hasInertShower = items.some((_, i) => !contingent.has(i))
    if (!hasInertShower) return undefined
  }

  return {
    puzzle,
    answer,
    meta: {
      difficulty,
      form,
      a,
      b,
      ruleHolds: evalRule(
        puzzle.rule,
        items.map((it) => it.attrs),
      ),
    },
  }
}
