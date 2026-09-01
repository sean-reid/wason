import { expect, test } from '@playwright/test'
import { dailyPuzzle } from '../src/daily'
import { firstDateOf } from './helpers'

test('identification day: exact set reveals the rule in force', async ({
  page,
}) => {
  const date = firstDateOf('ident')
  const g = dailyPuzzle(date)
  await page.goto(`/wason/?date=${date}`)
  await expect(page.getByTestId('rule')).toContainText('3.')
  for (const i of g.answer) {
    await page.locator(`.card[data-index="${i}"]`).click()
  }
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  const inForce = g.meta.kind === 'ident' ? g.meta.inForce : -1
  await expect(page.getByTestId('verdict')).toContainText(
    `Rule ${inForce + 1} was in force.`,
  )
  await page.screenshot({
    path: 'test-results/ident-solved.png',
    fullPage: true,
  })
})

test('identification day: an insufficient set fails', async ({ page }) => {
  const date = firstDateOf('ident')
  const g = dailyPuzzle(date)
  await page.goto(`/wason/?date=${date}`)
  await page.locator(`.card[data-index="${g.answer[0]}"]`).click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Not proven.')
})
