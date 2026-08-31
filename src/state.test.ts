import { describe, expect, it } from 'vitest'
import {
  loadState,
  markKindSeen,
  practiceStats,
  recordPractice,
  saveResult,
  streak,
} from './state'

function fakeStorage(initial?: string) {
  const map = new Map<string, string>()
  if (initial !== undefined) map.set('wason', initial)
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  }
}

describe('loadState', () => {
  it('returns a fresh state when empty', () => {
    expect(loadState(fakeStorage())).toEqual({
      version: 1,
      results: {},
      practice: {},
      seenKinds: [],
    })
  })

  it('returns a fresh state on corrupted data', () => {
    expect(loadState(fakeStorage('{nope'))).toEqual({
      version: 1,
      results: {},
      practice: {},
      seenKinds: [],
    })
    expect(loadState(fakeStorage('{"version":9}'))).toEqual({
      version: 1,
      results: {},
      practice: {},
      seenKinds: [],
    })
  })

  it('round-trips a saved result', () => {
    const storage = fakeStorage()
    saveResult(storage, '2026-09-07', { picked: ['0', '3'], exact: true })
    expect(loadState(storage).results['2026-09-07']).toEqual({
      picked: ['0', '3'],
      exact: true,
    })
  })
})

describe('streak', () => {
  const exact = { picked: ['0'], exact: true }
  const failed = { picked: ['0'], exact: false }

  it('counts consecutive exact days ending at the given date', () => {
    const results = {
      '2026-09-05': exact,
      '2026-09-06': exact,
      '2026-09-07': exact,
    }
    expect(streak(results, '2026-09-07')).toBe(3)
  })

  it('is zero when the given date was failed or unplayed', () => {
    expect(streak({ '2026-09-07': failed }, '2026-09-07')).toBe(0)
    expect(streak({}, '2026-09-07')).toBe(0)
  })

  it('stops at a gap or a failure', () => {
    const gap = { '2026-09-05': exact, '2026-09-07': exact }
    expect(streak(gap, '2026-09-07')).toBe(1)
    const broken = {
      '2026-09-05': exact,
      '2026-09-06': failed,
      '2026-09-07': exact,
    }
    expect(streak(broken, '2026-09-07')).toBe(1)
  })

  it('crosses month boundaries', () => {
    const results = { '2026-08-31': exact, '2026-09-01': exact }
    expect(streak(results, '2026-09-01')).toBe(2)
  })
})

describe('practice stats', () => {
  it('records plays and exact solves per kind', () => {
    const storage = fakeStorage()
    recordPractice(storage, 'standard', true)
    recordPractice(storage, 'standard', false)
    recordPractice(storage, 'multi', true)
    const state = loadState(storage)
    expect(practiceStats(state, 'standard')).toEqual({ played: 2, exact: 1 })
    expect(practiceStats(state, 'multi')).toEqual({ played: 1, exact: 1 })
    expect(practiceStats(state, 'audit')).toEqual({ played: 0, exact: 0 })
  })

  it('tolerates stored data without a practice map', () => {
    const storage = fakeStorage(JSON.stringify({ version: 1, results: {} }))
    expect(practiceStats(loadState(storage), 'standard')).toEqual({
      played: 0,
      exact: 0,
    })
  })
})

describe('markKindSeen', () => {
  it('records each kind once', () => {
    const storage = fakeStorage()
    markKindSeen(storage, 'multi')
    markKindSeen(storage, 'multi')
    markKindSeen(storage, 'audit')
    expect(loadState(storage).seenKinds).toEqual(['multi', 'audit'])
  })
})
