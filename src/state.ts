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
}

const KEY = 'wason'

export function loadState(storage: Pick<Storage, 'getItem'>): SaveData {
  try {
    const raw = storage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>
      if (parsed.version === 1 && parsed.results) {
        return {
          version: 1,
          results: parsed.results,
          practice: parsed.practice ?? {},
        }
      }
    }
  } catch {
    // fall through to a fresh state
  }
  return { version: 1, results: {}, practice: {} }
}

export function saveResult(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  date: string,
  result: DayResult,
): SaveData {
  const state = loadState(storage)
  state.results[date] = result
  storage.setItem(KEY, JSON.stringify(state))
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
  storage.setItem(KEY, JSON.stringify(state))
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

export function streak(
  results: Record<string, DayResult>,
  through: string,
): number {
  let count = 0
  let day = through
  while (results[day]?.exact) {
    count++
    day = previousDate(day)
  }
  return count
}
