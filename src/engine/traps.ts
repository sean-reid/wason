import { mulberry32 } from '../seed'
import type { GeneratedPuzzle } from './generate'
import { solve } from './solve'
import type { Item, Puzzle } from './types'
import {
  ATTRIBUTES,
  ITEM_COUNT,
  PREDS,
  buildProp,
  pick,
  sampleItems,
  type Difficulty,
  type RuleForm,
} from './vocab'

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
  // Large boards are rarely all-inert; a smaller board beats a blank day.
  if (difficulty !== 3) return generateVacuous(seed, 3)
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
  const items = sampleItems(rng, attributes, ITEM_COUNT[difficulty])
  if (!items) return undefined

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
    solution,
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
    solution,
    meta: { kind: 'broken', difficulty: 3, form: 'or', a, b, ruleHolds: false },
  }
}
