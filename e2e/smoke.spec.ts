import { expect, test } from '@playwright/test'

test('landing page renders the daily puzzle', async ({ page }) => {
  await page.goto('/wason/')
  await expect(page.getByRole('heading', { name: 'Wason' })).toBeVisible()
  await expect(page.getByTestId('rule')).toBeVisible()
  await expect(page.getByTestId('submit')).toBeVisible()
})
