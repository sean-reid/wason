import { expect, test } from '@playwright/test'
import { firstDateOf } from './helpers'

test('vacuous day: claiming nothing can break it is exact', async ({
  page,
}) => {
  await page.goto(`/wason/?date=${firstDateOf('vacuous')}`)
  await page.getByTestId('submit').click()
  await page.getByTestId('claim-none').click()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await expect(page.getByTestId('verdict')).toContainText(
    'No card could have hidden a counterexample.',
  )
  await page.screenshot({
    path: 'test-results/trap-vacuous.png',
    fullPage: true,
  })
})

test('vacuous day: flipping anything is wasteful', async ({ page }) => {
  await page.goto(`/wason/?date=${firstDateOf('vacuous')}`)
  await page.locator('.card[data-index="1"]').click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText(
    'Proven, but wasteful.',
  )
})

test('broken day: flagging the violation is exact', async ({ page }) => {
  await page.goto(`/wason/?date=${firstDateOf('broken')}`)
  await page.getByTestId('submit').click()
  await page.getByTestId('claim-broken').click()
  await expect(page.getByTestId('verdict')).toContainText('Sharp eye.')
  await expect(page.locator('.card.broken')).toHaveCount(1)
  await page.screenshot({
    path: 'test-results/trap-broken.png',
    fullPage: true,
  })
})

test('broken day: flipping cards misses the violation', async ({ page }) => {
  await page.goto(`/wason/?date=${firstDateOf('broken')}`)
  await page.locator('.card[data-index="0"]').click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText(
    'It was already broken.',
  )
})

test('standard day: wrongly claiming broken fails', async ({ page }) => {
  await page.goto('/wason/?date=2026-09-07')
  await page.getByTestId('submit').click()
  await page.getByTestId('claim-broken').click()
  await expect(page.getByTestId('verdict')).toContainText('Nothing was broken.')
})
