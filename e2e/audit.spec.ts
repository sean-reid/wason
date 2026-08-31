import { expect, test } from '@playwright/test'
import { dailyPuzzle, dayKind } from '../src/daily'
import { solve } from '../src/engine/solve'

function firstAuditDate(): string {
  for (let offset = 1; offset < 60; offset++) {
    const t = new Date(Date.UTC(2026, 7, 31 + offset))
    const date = t.toISOString().slice(0, 10)
    if (dayKind(date) === 'audit') return date
  }
  throw new Error('no audit date within range')
}

test('audit day: shows two rules and accepts the exact set', async ({
  page,
}) => {
  const date = firstAuditDate()
  const solution = solve(dailyPuzzle(date).puzzle)
  await page.goto(`/wason/?date=${date}`)
  await expect(page.getByTestId('rule')).toContainText('1.')
  await expect(page.getByTestId('rule')).toContainText('2.')
  for (const r of solution.reveals) {
    await page.locator(`.card[data-index="${r.item}"]`).click()
  }
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await expect(page.locator('.explain')).toContainText('rule')
  await page.screenshot({
    path: 'test-results/audit-solved.png',
    fullPage: true,
  })
})

test('audit day: covering only one rule is not enough', async ({ page }) => {
  const date = firstAuditDate()
  const solution = solve(dailyPuzzle(date).puzzle)
  const first = solution.reveals[0]!.item
  await page.goto(`/wason/?date=${date}`)
  await page.locator(`.card[data-index="${first}"]`).click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Not proven.')
})
