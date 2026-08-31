import { expect, test } from '@playwright/test'
import { generateConnective } from '../src/engine/generate'
import { hashSeed } from '../src/seed'

test('practice: solve a classic puzzle, see stats, continue', async ({
  page,
}) => {
  await page.goto('/wason/#practice')
  await expect(page.getByTestId('meta')).toContainText('0 played')

  const gen = generateConnective(hashSeed('practice-standard-2-0'), 2)
  for (const i of gen.answer) {
    await page.locator(`.card[data-index="${i}"]`).click()
  }
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await expect(page.getByTestId('meta')).toContainText('1 played · 1 exact')
  await page.screenshot({
    path: 'test-results/practice-solved.png',
    fullPage: true,
  })

  await page.getByTestId('next').click()
  await expect(page.getByTestId('submit')).toBeVisible()
  await expect(page.getByTestId('verdict')).toHaveCount(0)
})

test('practice: mechanic picker switches modes', async ({ page }) => {
  await page.goto('/wason/#practice')
  await page.locator('.chip[data-kind="ident"]').click()
  await expect(page.getByTestId('rule')).toContainText('3.')
})

test('nav switches between daily and practice', async ({ page }) => {
  await page.goto('/wason/')
  await page.getByRole('link', { name: 'Practice' }).click()
  await expect(page.getByTestId('meta')).toContainText('played')
  await page.getByRole('link', { name: 'Daily' }).click()
  await expect(page.getByTestId('meta')).toContainText('streak')
})
