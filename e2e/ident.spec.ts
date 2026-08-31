import { expect, test } from '@playwright/test'
import { dailyPuzzle, dayKind } from '../src/daily'

function firstIdentDate(): string {
  for (let offset = 1; offset < 60; offset++) {
    const t = new Date(Date.UTC(2026, 7, 31 + offset))
    const date = t.toISOString().slice(0, 10)
    if (dayKind(date) === 'ident') return date
  }
  throw new Error('no identification date within range')
}

test('identification day: exact set reveals the rule in force', async ({
  page,
}) => {
  const date = firstIdentDate()
  const g = dailyPuzzle(date)
  await page.goto(`/wason/?date=${date}`)
  await expect(page.getByTestId('rule')).toContainText('3.')
  for (const i of g.answer) {
    await page.locator(`.card[data-index="${i}"]`).click()
  }
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await expect(page.getByTestId('verdict')).toContainText(
    `Rule ${g.meta.inForce! + 1} was in force.`,
  )
  await page.screenshot({
    path: 'test-results/ident-solved.png',
    fullPage: true,
  })
})

test('identification day: an insufficient set fails', async ({ page }) => {
  const date = firstIdentDate()
  const g = dailyPuzzle(date)
  await page.goto(`/wason/?date=${date}`)
  await page.locator(`.card[data-index="${g.answer[0]}"]`).click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Not proven.')
})
