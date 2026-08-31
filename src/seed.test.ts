import { describe, expect, it } from 'vitest'
import { hashSeed, mulberry32 } from './seed'

describe('hashSeed', () => {
  it('is deterministic', () => {
    expect(hashSeed('wason-2026-08-31')).toBe(hashSeed('wason-2026-08-31'))
  })

  it('differs across nearby dates', () => {
    const seeds = new Set(
      ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02'].map((d) =>
        hashSeed(`wason-${d}`),
      ),
    )
    expect(seeds.size).toBe(4)
  })

  it('returns an unsigned 32-bit integer', () => {
    const h = hashSeed('wason')
    expect(Number.isInteger(h)).toBe(true)
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(2 ** 32)
  })
})

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b())
    }
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a()).not.toBe(b())
  })

  it('stays in [0, 1)', () => {
    const rng = mulberry32(hashSeed('range-check'))
    for (let i = 0; i < 1000; i++) {
      const x = rng()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})
