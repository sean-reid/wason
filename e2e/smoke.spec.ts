import { expect, test } from '@playwright/test'

test('landing page renders', async ({ page }) => {
  await page.goto('/wason/')
  await expect(page.getByRole('heading', { name: 'Wason' })).toBeVisible()
  await expect(page.getByText('A daily logic puzzle.')).toBeVisible()
})
