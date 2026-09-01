import { expect, test } from '@playwright/test'
import { dailyPuzzle } from '../src/daily'

const DATE = '2026-09-07'

test('solving with the exact set records an exact result', async ({ page }) => {
  const g = dailyPuzzle(DATE)
  await page.goto(`/wason/?date=${DATE}`)
  await expect(page.getByTestId('rule')).toBeVisible()

  for (const i of g.answer)
    await page.locator(`.card[data-index="${i}"]`).click()
  await page.getByTestId('submit').click()

  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await expect(page.getByTestId('meta')).toContainText('streak 1')

  await page.reload()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await expect(page.getByTestId('submit')).toHaveCount(0)
})

test('missing a required card fails the day', async ({ page }) => {
  const g = dailyPuzzle(DATE)
  await page.goto(`/wason/?date=${DATE}`)

  await page.locator(`.card[data-index="${g.answer[0]}"]`).click()
  await page.getByTestId('submit').click()

  await expect(page.getByTestId('verdict')).toContainText('Not proven.')
  await expect(page.locator('.card.wrong')).toHaveCount(g.answer.length - 1)
  await expect(page.getByTestId('meta')).toContainText('streak 0')
})

test('flipping extra cards is not exact', async ({ page }) => {
  const g = dailyPuzzle(DATE)
  const extra = g.puzzle.items.findIndex((_, i) => !g.answer.includes(i))
  await page.goto(`/wason/?date=${DATE}`)

  for (const i of [...g.answer, extra])
    await page.locator(`.card[data-index="${i}"]`).click()
  await page.getByTestId('submit').click()

  await expect(page.getByTestId('verdict')).toContainText(
    'Proven, but wasteful.',
  )
})

test.describe('share', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

  test('copies a spoiler-free result', async ({ page }) => {
    const g = dailyPuzzle(DATE)
    await page.goto(`/wason/?date=${DATE}`)
    for (const i of g.answer)
      await page.locator(`.card[data-index="${i}"]`).click()
    await page.getByTestId('submit').click()
    await page.getByTestId('share').click()

    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toContain('Wason #8 ✓')
    expect(text).toContain('streak 1')
    expect(text).not.toMatch(/card|flip/i)
  })
})

test('layout holds at phone, tablet, and desktop widths', async ({ page }) => {
  const g = dailyPuzzle(DATE)
  await page.goto(`/wason/?date=${DATE}`)
  for (const [w, h, name] of [
    [375, 667, 'phone'],
    [768, 1024, 'tablet'],
    [1024, 768, 'desktop'],
  ] as const) {
    await page.setViewportSize({ width: w, height: h })
    const card = page.locator('.card').first()
    const box = await card.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({
      path: `test-results/daily-${name}.png`,
      fullPage: true,
    })
  }
  for (const i of g.answer)
    await page.locator(`.card[data-index="${i}"]`).click()
  await page.getByTestId('submit').click()
  await page.screenshot({
    path: 'test-results/daily-solved.png',
    fullPage: true,
  })
})
