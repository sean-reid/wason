import { expect, test } from '@playwright/test'
import { todayLocal } from '../src/daily'
import { generateConnective } from '../src/engine/generate'
import { hashSeed } from '../src/seed'
import { firstDateOf, playExact } from './helpers'

test('archive lists days and reflects results', async ({ page }) => {
  const today = todayLocal()
  await page.goto(`/wason/?date=${today}`)
  await playExact(page, today)
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
  await page.goto(`/wason/?date=${firstDateOf('multi')}`)
  await expect(page.getByTestId('primer')).toBeVisible()
  await page.getByRole('link', { name: 'Practice this kind first' }).click()
  await expect(page.locator('.chip[data-kind="multi"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
