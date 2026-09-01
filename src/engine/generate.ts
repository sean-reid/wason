import { mulberry32 } from '../seed'
import { evalProp, evalRule } from './rule'
import { completions, solve, type Solution } from './solve'
import type { Item, Pred, Puzzle } from './types'
import {
  ATTRIBUTES,
  FORMS,
  IMPLIES_FORMS,
  ITEM_COUNT,
  PREDS,
  buildProp,
  pick,
  sampleItems,
  type Difficulty,
  type RelationalForm,
  type RuleForm,
  type RuleSpec,
} from './vocab'
import { buildWorlds, maskSettles, minimalMasks, worldDigit } from './worlds'

export { ATTRIBUTES, FORMS, ITEM_COUNT, PREDS, buildProp } from './vocab'
export { generateBroken, generateVacuous } from './traps'
export type { Difficulty, RelationalForm, RuleForm, RuleSpec } from './vocab'

export type PuzzleKind =
  'standard' | 'vacuous' | 'broken' | 'multi' | 'audit' | 'relational' | 'ident'

interface MetaBase {
  difficulty: Difficulty
  form: RuleForm | RelationalForm
  a: Pred
  b: Pred
  ruleHolds: boolean
}

export type PuzzleMeta =
  | (MetaBase & {
      kind: 'standard' | 'vacuous' | 'broken' | 'multi' | 'relational'
    })
  | (MetaBase & { kind: 'audit'; rules: readonly RuleSpec[] })
  | (MetaBase & { kind: 'ident'; rules: readonly RuleSpec[]; inForce: number })

export interface GeneratedPuzzle {
  puzzle: Puzzle
  answer: readonly number[]
  solution: Solution
  meta: PuzzleMeta
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
  const items = sampleItems(rng, attributes, ITEM_COUNT[difficulty])
  if (!items) return undefined
  const n = items.length

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
    solution,
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

const MULTI_FORMS: readonly RuleForm[] = ['if-then', 'if-then-not', 'or']

// A multi-attribute day: cards carry all three attributes and hide two, so a
// pick is a card plus a hidden side. Some cards need one specific side, some
// need both, and picking an uninformative side is the new way to be wrong.
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
    solution,
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
  const items = sampleItems(rng, attributes, 6)
  if (!items) return undefined
  const n = items.length

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
    solution,
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

// A relational day: the rule constrains neighboring cards, so no card can be
// judged alone and the solver works over whole worlds.
export function generateRelational(seed: number): GeneratedPuzzle {
  const rng = mulberry32(seed)
  for (let attempt = 0; attempt < 800; attempt++) {
    const candidate = tryGenerateRelational(rng)
    if (candidate) return candidate
  }
  throw new Error(`no relational puzzle for seed ${seed}`)
}

function tryGenerateRelational(rng: () => number): GeneratedPuzzle | undefined {
  const variant: RelationalForm = rng() < 0.5 ? 'right-of' : 'never-adjacent'
  let a: Pred
  let b: Pred
  let attributes: typeof ATTRIBUTES
  if (variant === 'right-of') {
    a = pick(rng, PREDS)
    b = pick(
      rng,
      PREDS.filter((p) => p.attr !== a.attr),
    )
    attributes = ATTRIBUTES.filter((x) => x.id === a.attr || x.id === b.attr)
  } else {
    a = pick(rng, PREDS)
    b = pick(
      rng,
      PREDS.filter((p) => p.attr === a.attr),
    )
    const carrier = pick(
      rng,
      ATTRIBUTES.filter((x) => x.id !== a.attr),
    )
    attributes = [ATTRIBUTES.find((x) => x.id === a.attr)!, carrier]
  }

  const items = sampleItems(rng, attributes, 5)
  if (!items) return undefined
  const n = items.length

  const puzzle: Puzzle = {
    attributes,
    items,
    rule: { kind: 'adjacent', variant, a, b },
  }
  const solution = solve(puzzle)
  if (solution.status !== 'test' || !solution.unique) return undefined
  const answer = solution.reveals.map((r) => r.item)
  if (answer.length < 2 || answer.length > 4) return undefined
  if (answer.length >= n) return undefined

  return {
    puzzle,
    answer,
    solution,
    meta: {
      kind: 'relational',
      difficulty: 4,
      form: variant,
      a,
      b,
      ruleHolds: evalRule(
        puzzle.rule,
        items.map((it) => it.attrs),
      ),
    },
  }
}

const IDENT_FORMS: readonly RuleForm[] = [
  'if-then',
  'if-then-not',
  'or',
  'unless',
  'iff',
]

// An identification day: three candidate rules are shown and exactly one is
// in force. The answer is the unique minimal reveal set guaranteed to tell
// them apart no matter what the reveals show.
export function generateIdent(seed: number): GeneratedPuzzle {
  const rng = mulberry32(seed)
  for (let attempt = 0; attempt < 3000; attempt++) {
    const candidate = tryGenerateIdent(rng)
    if (candidate) return candidate
  }
  throw new Error(`no identification puzzle for seed ${seed}`)
}

function tryGenerateIdent(rng: () => number): GeneratedPuzzle | undefined {
  const attrX = pick(rng, ATTRIBUTES)
  const attrY = pick(
    rng,
    ATTRIBUTES.filter((z) => z.id !== attrX.id),
  )
  const xPreds = PREDS.filter((p) => p.attr === attrX.id)
  const yPreds = PREDS.filter((p) => p.attr === attrY.id)
  const specs: RuleSpec[] = []
  const seenAst = new Set<string>()
  for (let k = 0; k < 3; k++) {
    const spec: RuleSpec = {
      form: pick(rng, IDENT_FORMS),
      a: pick(rng, xPreds),
      b: pick(rng, yPreds),
    }
    const key = JSON.stringify(buildProp(spec.form, spec.a, spec.b))
    if (seenAst.has(key)) return undefined
    seenAst.add(key)
    specs.push(spec)
  }
  const props = specs.map((s) => buildProp(s.form, s.a, s.b))

  const attributes = [attrX, attrY]
  const items = sampleItems(rng, attributes, 5)
  if (!items) return undefined
  const n = items.length

  const satisfied = props.map((p) => items.every((it) => evalProp(p, it.attrs)))
  if (satisfied.filter(Boolean).length !== 1) return undefined
  const inForce = satisfied.indexOf(true)

  const table = buildWorlds(items, attributes)
  const truthPer = props.map((p) =>
    table.per.map((comps) => comps.map((c) => evalProp(p, c))),
  )
  const labels = new Int8Array(table.count)
  const seenLabel = [false, false, false]
  for (let w = 0; w < table.count; w++) {
    let label = -1
    let dup = false
    for (let k = 0; k < 3; k++) {
      let sat = true
      for (let i = 0; i < items.length; i++) {
        if (!truthPer[k]![i]![worldDigit(table, w, i)]) {
          sat = false
          break
        }
      }
      if (sat) {
        if (label >= 0) dup = true
        label = k
      }
    }
    labels[w] = label < 0 || dup ? -1 : label
    if (labels[w]! >= 0) seenLabel[labels[w]!] = true
  }
  if (!seenLabel.every(Boolean)) return undefined

  const minimals = minimalMasks(n, (mask) =>
    maskSettles(table, mask, (w) => labels[w]!),
  )
  if (minimals.length !== 1) return undefined
  const answer: number[] = []
  for (let i = 0; i < n; i++) if (minimals[0]! & (1 << i)) answer.push(i)
  if (answer.length < 2 || answer.length > 4) return undefined

  const puzzle: Puzzle = {
    attributes,
    items,
    rule: { kind: 'every-item', prop: props[inForce]! },
  }
  return {
    puzzle,
    answer,
    solution: solve(puzzle),
    meta: {
      kind: 'ident',
      difficulty: 3,
      form: specs[inForce]!.form,
      a: specs[inForce]!.a,
      b: specs[inForce]!.b,
      rules: specs,
      inForce,
      ruleHolds: true,
    },
  }
}
