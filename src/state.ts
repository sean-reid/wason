export type Claim = 'none' | 'broken'

// A pick is a card index ("2"), or card:face on multi-attribute days
// ("2:number").
export interface DayResult {
  picked: readonly string[]
  exact: boolean
  claim?: Claim
}

export interface PracticeStats {
  played: number
  exact: number
}

export interface SaveData {
  version: 1
  results: Record<string, DayResult>
  practice: Record<string, PracticeStats>
  seenKinds: string[]
}

const KEY = 'wason'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validResults(value: unknown): Record<string, DayResult> {
  if (!isRecord(value)) return {}
  const out: Record<string, DayResult> = {}
  for (const [date, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue
    if (!Array.isArray(entry.picked) || typeof entry.exact !== 'boolean')
      continue
    out[date] = {
      picked: entry.picked.map(String),
      exact: entry.exact,
      claim:
        entry.claim === 'none' || entry.claim === 'broken'
          ? entry.claim
          : undefined,
    }
  }
  return out
}

function validPractice(value: unknown): Record<string, PracticeStats> {
  if (!isRecord(value)) return {}
  const out: Record<string, PracticeStats> = {}
  for (const [kind, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue
    if (typeof entry.played !== 'number' || typeof entry.exact !== 'number')
      continue
    out[kind] = { played: entry.played, exact: entry.exact }
  }
  return out
}

// Data written by a newer schema must never be overwritten by this code.
const foreignBlobs = new WeakSet<SaveData>()

export function isForeign(state: SaveData): boolean {
  return foreignBlobs.has(state)
}

function migrate(parsed: unknown): SaveData | undefined {
  if (!isRecord(parsed)) return undefined
  // Version bumps add a step here that rewrites the previous shape in place.
  if (parsed.version !== 1) return undefined
  return {
    version: 1,
    results: validResults(parsed.results),
    practice: validPractice(parsed.practice),
    seenKinds: Array.isArray(parsed.seenKinds)
      ? parsed.seenKinds.map(String)
      : [],
  }
}

export function loadState(storage: Pick<Storage, 'getItem'>): SaveData {
  const fresh: SaveData = {
    version: 1,
    results: {},
    practice: {},
    seenKinds: [],
  }
  try {
    const raw = storage.getItem(KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      const migrated = migrate(parsed)
      if (migrated) return migrated
      if (
        isRecord(parsed) &&
        typeof parsed.version === 'number' &&
        parsed.version > 1
      ) {
        foreignBlobs.add(fresh)
      }
    }
  } catch {
    // fall through to a fresh state
  }
  return fresh
}

function persist(storage: Pick<Storage, 'setItem'>, state: SaveData): void {
  if (foreignBlobs.has(state)) return
  try {
    storage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage may be full or blocked; the in-memory state still renders
  }
}

export function markKindSeen(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  kind: string,
): SaveData {
  const state = loadState(storage)
  if (!state.seenKinds.includes(kind)) {
    state.seenKinds.push(kind)
    persist(storage, state)
  }
  return state
}

export function saveResult(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  date: string,
  result: DayResult,
): SaveData {
  const state = loadState(storage)
  state.results[date] = result
  persist(storage, state)
  return state
}

export function recordPractice(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  kind: string,
  exact: boolean,
): SaveData {
  const state = loadState(storage)
  const current = state.practice[kind] ?? { played: 0, exact: 0 }
  state.practice[kind] = {
    played: current.played + 1,
    exact: current.exact + (exact ? 1 : 0),
  }
  persist(storage, state)
  return state
}

export function practiceStats(state: SaveData, kind: string): PracticeStats {
  return state.practice[kind] ?? { played: 0, exact: 0 }
}

function previousDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y!, m! - 1, d! - 1))
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(t.getUTCDate()).padStart(2, '0')
  return `${t.getUTCFullYear()}-${mm}-${dd}`
}

const STREAK_CAP = 40000

export function streak(
  results: Record<string, DayResult>,
  through: string,
): number {
  let count = 0
  let day = through
  while (results[day]?.exact && count < STREAK_CAP) {
    count++
    day = previousDate(day)
  }
  return count
}

// The header streak: an unplayed today extends yesterday's run rather than
// reading zero.
export function currentStreak(
  results: Record<string, DayResult>,
  today: string,
): number {
  return results[today]
    ? streak(results, today)
    : streak(results, previousDate(today))
}
