import { expect, test } from '@playwright/test'
import { dailyPuzzle, dayKind } from '../src/daily'
import { solve } from '../src/engine/solve'

function firstRelationalDate(): string {
  for (let offset = 1; offset < 60; offset++) {
    const t = new Date(Date.UTC(2026, 7, 31 + offset))
    const date = t.toISOString().slice(0, 10)
    if (dayKind(date) === 'relational') return date
  }
  throw new Error('no relational date within range')
}

test('relational day: the exact set is exact', async ({ page }) => {
  const date = firstRelationalDate()
  const solution = solve(dailyPuzzle(date).puzzle)
  await page.goto(`/wason/?date=${date}`)
  for (const r of solution.reveals) {
    await page.locator(`.card[data-index="${r.item}"]`).click()
  }
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await page.screenshot({
    path: 'test-results/relational-solved.png',
    fullPage: true,
  })
})

test('relational day: leaving out a coupled card fails', async ({ page }) => {
  const date = firstRelationalDate()
  const solution = solve(dailyPuzzle(date).puzzle)
  await page.goto(`/wason/?date=${date}`)
  await page.locator(`.card[data-index="${solution.reveals[0]!.item}"]`).click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Not proven.')
})
