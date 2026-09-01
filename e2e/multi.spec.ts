import { expect, test } from '@playwright/test'
import { dailyPuzzle } from '../src/daily'
import { solve } from '../src/engine/solve'
import { firstDateOf } from './helpers'

function requiredKeys(date: string): string[] {
  const solution = solve(dailyPuzzle(date).puzzle)
  return solution.reveals.flatMap((r) => r.attrs.map((a) => `${r.item}:${a}`))
}

test('multi day: the exact face set is exact', async ({ page }) => {
  const date = firstDateOf('multi')
  await page.goto(`/wason/?date=${date}`)
  for (const key of requiredKeys(date)) {
    await page.locator(`.chip[data-key="${key}"]`).click()
  }
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await page.screenshot({
    path: 'test-results/multi-solved.png',
    fullPage: true,
  })
})

test('multi day: an extra face is wasteful', async ({ page }) => {
  const date = firstDateOf('multi')
  const keys = requiredKeys(date)
  await page.goto(`/wason/?date=${date}`)
  for (const key of keys) await page.locator(`.chip[data-key="${key}"]`).click()
  const extra = page.locator('.chip[aria-pressed="false"]').first()
  await extra.click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText(
    'Proven, but wasteful.',
  )
})

test('multi day: chips meet touch targets and layout holds on phone', async ({
  page,
}) => {
  const date = firstDateOf('multi')
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto(`/wason/?date=${date}`)
  const box = await page.locator('.chip').first().boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  await page.screenshot({
    path: 'test-results/multi-phone.png',
    fullPage: true,
  })
})
