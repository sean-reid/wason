import { expect, test } from '@playwright/test'
import { dailyPuzzle, dayKind, todayLocal } from '../src/daily'
import { solve } from '../src/engine/solve'
import { generateConnective } from '../src/engine/generate'
import { hashSeed } from '../src/seed'

test('archive lists days and reflects results', async ({ page }) => {
  const today = todayLocal()
  const gen = dailyPuzzle(today)
  const solution = solve(gen.puzzle)
  await page.goto(`/wason/?date=${today}`)
  if (solution.status === 'already-false') {
    await page.getByTestId('submit').click()
    await page.getByTestId('claim-broken').click()
  } else if (solution.reveals.length === 0) {
    await page.getByTestId('submit').click()
    await page.getByTestId('claim-none').click()
  } else {
    for (const r of solution.reveals) {
      await page.locator(`.card[data-index="${r.item}"]`).click()
    }
    await page.getByTestId('submit').click()
  }
  await page.getByRole('link', { name: 'Archive' }).click()
  const row = page.locator(`.archive a[href="?date=${today}"]`)
  await expect(row).toContainText('✓')
  await page.screenshot({ path: 'test-results/archive.png', fullPage: true })
  await row.click()
  await expect(page.getByTestId('verdict')).toBeVisible()
})

test('how to play explains and offers a solvable example', async ({ page }) => {
  await page.goto('/wason/#how')
  await expect(
    page.getByText('Prove the rule, or say why you cannot.'),
  ).toBeVisible()
  const gen = generateConnective(hashSeed('tutorial-0'), 1)
  for (const i of gen.answer) {
    await page.locator(`.card[data-index="${i}"]`).click()
  }
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await page.screenshot({ path: 'test-results/how.png', fullPage: true })
  await page.getByTestId('another').click()
  await expect(page.getByTestId('submit')).toBeVisible()
})

test('a new mechanic day shows a primer that deep-links practice', async ({
  page,
}) => {
  let multiDate = ''
  for (let offset = 1; offset < 60; offset++) {
    const t = new Date(Date.UTC(2026, 7, 31 + offset))
    const date = t.toISOString().slice(0, 10)
    if (dayKind(date) === 'multi') {
      multiDate = date
      break
    }
  }
  await page.goto(`/wason/?date=${multiDate}`)
  await expect(page.getByTestId('primer')).toBeVisible()
  await page.getByRole('link', { name: 'Practice this kind first' }).click()
  await expect(page.locator('.chip[data-kind="multi"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
