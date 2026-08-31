import {
  generateAudit,
  generateBroken,
  generateConnective,
  generateMultiAttr,
  generateRelational,
  generateVacuous,
  type Difficulty,
  type GeneratedPuzzle,
  type PuzzleKind,
} from './engine/generate'
import { hashSeed } from './seed'

export const DAY_ONE = '2026-08-31'

const MS_PER_DAY = 86400000

function utc(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!)
}

export function todayLocal(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  return !Number.isNaN(utc(date))
}

export function puzzleNumber(date: string): number {
  return Math.round((utc(date) - utc(DAY_ONE)) / MS_PER_DAY) + 1
}

// Monday through Sunday ramp.
const WEEKDAY_DIFFICULTY: Record<number, Difficulty> = {
  1: 1,
  2: 2,
  3: 2,
  4: 3,
  5: 3,
  6: 4,
  0: 5,
}

export function difficultyFor(date: string): Difficulty {
  return WEEKDAY_DIFFICULTY[new Date(utc(date)).getUTCDay()]!
}

// Roughly one non-Monday in eight is a trap day; other Saturdays are
// multi-attribute days, Fridays are relational, Sundays are two-rule audits.
export function dayKind(date: string): PuzzleKind {
  const weekday = new Date(utc(date)).getUTCDay()
  if (weekday === 1) return 'standard'
  const h = hashSeed(`wason-trap-${date}`)
  if (h % 8 === 0) return (h >> 3) % 2 === 0 ? 'vacuous' : 'broken'
  if (weekday === 6) return 'multi'
  if (weekday === 0) return 'audit'
  if (weekday === 5) return 'relational'
  return 'standard'
}

export function dailyPuzzle(date: string): GeneratedPuzzle {
  const kind = dayKind(date)
  const seed = hashSeed(`wason-${date}`)
  if (kind === 'vacuous') return generateVacuous(seed, difficultyFor(date))
  if (kind === 'broken') return generateBroken(seed)
  if (kind === 'multi') return generateMultiAttr(seed)
  if (kind === 'audit') return generateAudit(seed)
  if (kind === 'relational') return generateRelational(seed)
  return generateConnective(seed, difficultyFor(date))
}
