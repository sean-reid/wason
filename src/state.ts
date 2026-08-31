export type Claim = 'none' | 'broken'

export interface DayResult {
  picked: readonly number[]
  exact: boolean
  claim?: Claim
}

export interface SaveData {
  version: 1
  results: Record<string, DayResult>
}

const KEY = 'wason'

export function loadState(storage: Pick<Storage, 'getItem'>): SaveData {
  try {
    const raw = storage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as SaveData
      if (parsed.version === 1 && parsed.results) return parsed
    }
  } catch {
    // fall through to a fresh state
  }
  return { version: 1, results: {} }
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
