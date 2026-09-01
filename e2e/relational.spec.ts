import { expect, test } from '@playwright/test'
import { dailyPuzzle } from '../src/daily'
import { solve } from '../src/engine/solve'
import { firstDateOf } from './helpers'

test('relational day: the exact set is exact', async ({ page }) => {
  const date = firstDateOf('relational')
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
  const date = firstDateOf('relational')
  const solution = solve(dailyPuzzle(date).puzzle)
  await page.goto(`/wason/?date=${date}`)
  await page.locator(`.card[data-index="${solution.reveals[0]!.item}"]`).click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Not proven.')
})
