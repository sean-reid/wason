import type { Page } from '@playwright/test'
import { dailyPuzzle, dayKind } from '../src/daily'
import type { PuzzleKind } from '../src/engine/generate'
import { solve } from '../src/engine/solve'
import { skinFor } from '../src/skins'

export function firstDateOf(kind: PuzzleKind, limit = 400): string {
  for (let offset = 1; offset < limit; offset++) {
    const t = new Date(Date.UTC(2026, 7, 31 + offset))
    const date = t.toISOString().slice(0, 10)
    if (dayKind(date) === kind) return date
  }
  throw new Error(`no ${kind} date within ${limit} days`)
}

export function firstDateWithSkin(id: string, limit = 400): string {
  for (let offset = 1; offset < limit; offset++) {
    const t = new Date(Date.UTC(2026, 7, 31 + offset))
    const date = t.toISOString().slice(0, 10)
    if (skinFor(date, dailyPuzzle(date)).id === id) return date
  }
  throw new Error(`no ${id} skin date within ${limit} days`)
}

export async function playExact(page: Page, date: string): Promise<void> {
  const gen = dailyPuzzle(date)
  const solution = solve(gen.puzzle)
  if (solution.status === 'already-false') {
    await page.getByTestId('submit').click()
    await page.getByTestId('claim-broken').click()
    return
  }
  if (gen.answer.length === 0) {
    await page.getByTestId('submit').click()
    await page.getByTestId('claim-none').click()
    return
  }
  if (gen.meta.kind === 'multi') {
    for (const r of solution.reveals) {
      for (const a of r.attrs) {
        await page.locator(`.chip[data-key="${r.item}:${a}"]`).click()
      }
    }
  } else {
    for (const i of gen.answer) {
      await page.locator(`.card[data-index="${i}"]`).click()
    }
  }
  await page.getByTestId('submit').click()
}
