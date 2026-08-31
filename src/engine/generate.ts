import { mulberry32 } from '../seed'
import { evalProp, evalRule } from './rule'
import { completions, solve } from './solve'
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
    kind: PuzzleKind
    difficulty: Difficulty
    form: RuleForm
    a: Pred
    b: Pred
    ruleHolds: boolean
    rules?: readonly RuleSpec[]
  }
}

export type PuzzleKind = 'standard' | 'vacuous' | 'broken' | 'multi' | 'audit'

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
      kind: 'standard',
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

const VACUOUS_FORMS: readonly RuleForm[] = ['if-then', 'only-if', 'if-then-not']

// A vacuous day: the rule mentions live categories but no visible face is
// consistent with hiding a counterexample. The exact answer is no flips.
export function generateVacuous(
  seed: number,
  difficulty: Difficulty,
): GeneratedPuzzle {
  const rng = mulberry32(seed)
  for (let attempt = 0; attempt < 5000; attempt++) {
    const candidate = tryGenerateVacuous(rng, difficulty)
    if (candidate) return candidate
  }
  throw new Error(`no vacuous puzzle for seed ${seed}`)
}

function tryGenerateVacuous(
  rng: () => number,
  difficulty: Difficulty,
): GeneratedPuzzle | undefined {
  const form = pick(rng, VACUOUS_FORMS)
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
  if (solution.status !== 'test' || solution.reveals.length > 0)
    return undefined

  return {
    puzzle,
    answer: [],
    meta: { kind: 'vacuous', difficulty, form, a, b, ruleHolds: true },
  }
}

const BREAKABLE_PAIRS: readonly (readonly [string, string])[] = [
  ['odd', 'prime'],
  ['red', 'blue'],
]

// A broken day: the rule constrains one attribute, and exactly one visible
// face already violates it. The exact answer is flagging the violation.
export function generateBroken(seed: number): GeneratedPuzzle {
  const rng = mulberry32(seed)
  for (let attempt = 0; attempt < 5000; attempt++) {
    const candidate = tryGenerateBroken(rng)
    if (candidate) return candidate
  }
  throw new Error(`no broken puzzle for seed ${seed}`)
}

function tryGenerateBroken(rng: () => number): GeneratedPuzzle | undefined {
  const [aId, bId] = pick(rng, BREAKABLE_PAIRS)
  const a = PREDS.find((p) => p.id === aId)!
  const b = PREDS.find((p) => p.id === bId)!
  const ruleAttr = ATTRIBUTES.find((x) => x.id === a.attr)!
  const carrier = pick(
    rng,
    ATTRIBUTES.filter((x) => x.id !== ruleAttr.id),
  )
  const satisfying = ruleAttr.domain.filter(
    (v) => a.values.includes(v) || b.values.includes(v),
  )
  const violating = ruleAttr.domain.filter(
    (v) => !a.values.includes(v) && !b.values.includes(v),
  )
  const n = 5
  const violatorAt = Math.floor(rng() * n)

  const items: Item[] = []
  const usedFaces = new Set<string>()
  for (let i = 0; i < n; i++) {
    const showRule = i === violatorAt || rng() < 0.4
    const shownAttr = showRule ? ruleAttr : carrier
    const hiddenAttr = showRule ? carrier : ruleAttr
    const shownValue =
      i === violatorAt
        ? pick(rng, violating)
        : showRule
          ? pick(rng, satisfying)
          : pick(rng, carrier.domain)
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

  const hiders = items.filter((it) => !it.shown.includes(ruleAttr.id)).length
  if (hiders < 2) return undefined

  const puzzle: Puzzle = {
    attributes: [ruleAttr, carrier],
    items,
    rule: {
      kind: 'every-item',
      prop: {
        kind: 'or',
        of: [
          { kind: 'pred', pred: a },
          { kind: 'pred', pred: b },
        ],
      },
    },
  }
  const solution = solve(puzzle)
  if (solution.status !== 'already-false') return undefined
  if (solution.perItem.filter((r) => r.kind === 'always-false').length !== 1)
    return undefined

  return {
    puzzle,
    answer: [],
    meta: { kind: 'broken', difficulty: 3, form: 'or', a, b, ruleHolds: false },
  }
}

const MULTI_FORMS: readonly RuleForm[] = ['if-then', 'if-then-not', 'or']

// A multi-attribute day: cards carry all three attributes and hide two, so a
// pick is a card plus a face. Some cards need one specific face, some need
// both, and picking an uninformative face is the new way to be wrong.
export function generateMultiAttr(seed: number): GeneratedPuzzle {
  const rng = mulberry32(seed)
  for (let attempt = 0; attempt < 5000; attempt++) {
    const candidate = tryGenerateMultiAttr(rng)
    if (candidate) return candidate
  }
  throw new Error(`no multi-attribute puzzle for seed ${seed}`)
}

function tryGenerateMultiAttr(rng: () => number): GeneratedPuzzle | undefined {
  const form = pick(rng, MULTI_FORMS)
  const a = pick(rng, PREDS)
  const b = pick(
    rng,
    PREDS.filter((p) => p.attr !== a.attr),
  )
  const n = 4

  const items: Item[] = []
  const usedFaces = new Set<string>()
  for (let i = 0; i < n; i++) {
    const shownAttr = i < 3 ? ATTRIBUTES[i]! : pick(rng, ATTRIBUTES)
    const shownValue = pick(rng, shownAttr.domain)
    const face = `${shownAttr.id} ${String(shownValue)}`
    if (usedFaces.has(face)) return undefined
    usedFaces.add(face)
    const attrs: Record<string, string | number> = {}
    for (const attr of ATTRIBUTES) {
      attrs[attr.id] =
        attr.id === shownAttr.id ? shownValue : pick(rng, attr.domain)
    }
    items.push({ attrs, shown: [shownAttr.id] })
  }

  const puzzle: Puzzle = {
    attributes: ATTRIBUTES,
    items,
    rule: { kind: 'every-item', prop: buildProp(form, a, b) },
  }
  const solution = solve(puzzle)
  if (solution.status !== 'test' || !solution.unique) return undefined

  const reveals = solution.reveals
  const pairCount = reveals.reduce((sum, r) => sum + r.attrs.length, 0)
  if (pairCount < 3 || pairCount > 6) return undefined
  if (!reveals.some((r) => r.attrs.length === 1)) return undefined
  if (!reveals.some((r) => r.attrs.length === 2)) return undefined
  if (reveals.length >= n) return undefined

  return {
    puzzle,
    answer: reveals.map((r) => r.item),
    meta: {
      kind: 'multi',
      difficulty: 4,
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

export interface RuleSpec {
  form: RuleForm
  a: Pred
  b: Pred
}

const AUDIT_FORMS: readonly RuleForm[] = [
  'if-then',
  'if-then-not',
  'only-if',
  'or',
  'unless',
]

// An audit day: two rules over the same attribute pair are in force at once.
// One flip can test both rules, so the minimal set rewards spotting overlap.
export function generateAudit(seed: number): GeneratedPuzzle {
  const rng = mulberry32(seed)
  for (let attempt = 0; attempt < 5000; attempt++) {
    const candidate = tryGenerateAudit(rng)
    if (candidate) return candidate
  }
  throw new Error(`no audit puzzle for seed ${seed}`)
}

function tryGenerateAudit(rng: () => number): GeneratedPuzzle | undefined {
  const attrX = pick(rng, ATTRIBUTES)
  const attrY = pick(
    rng,
    ATTRIBUTES.filter((z) => z.id !== attrX.id),
  )
  const xPreds = PREDS.filter((p) => p.attr === attrX.id)
  const yPreds = PREDS.filter((p) => p.attr === attrY.id)
  const r1: RuleSpec = {
    form: pick(rng, AUDIT_FORMS),
    a: pick(rng, xPreds),
    b: pick(rng, yPreds),
  }
  const r2: RuleSpec = {
    form: pick(rng, AUDIT_FORMS),
    a: pick(rng, xPreds),
    b: pick(rng, yPreds),
  }
  const p1 = buildProp(r1.form, r1.a, r1.b)
  const p2 = buildProp(r2.form, r2.a, r2.b)
  if (JSON.stringify(p1) === JSON.stringify(p2)) return undefined

  const attributes = [attrX, attrY]
  const n = 6
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

  const puzzle: Puzzle = {
    attributes,
    items,
    rule: { kind: 'every-item', prop: { kind: 'and', of: [p1, p2] } },
  }
  const solution = solve(puzzle)
  if (solution.status !== 'test' || !solution.unique) return undefined

  const answer = solution.reveals.map((r) => r.item)
  if (answer.length < 3 || answer.length >= n) return undefined

  const breakSets = answer.map((i) => {
    const comps = completions(items[i]!, attributes)
    return [p1, p2].map((p) => comps.some((c) => !evalProp(p, c)))
  })
  if (!breakSets.some(([one, two]) => one && two)) return undefined
  if (!breakSets.some(([one, two]) => one && !two)) return undefined
  if (!breakSets.some(([one, two]) => !one && two)) return undefined

  return {
    puzzle,
    answer,
    meta: {
      kind: 'audit',
      difficulty: 5,
      form: r1.form,
      a: r1.a,
      b: r1.b,
      rules: [r1, r2],
      ruleHolds: evalRule(
        puzzle.rule,
        items.map((it) => it.attrs),
      ),
    },
  }
}
