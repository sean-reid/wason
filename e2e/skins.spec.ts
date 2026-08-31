import { expect, test } from '@playwright/test'
import { dailyPuzzle } from '../src/daily'
import { skinFor } from '../src/skins'

function firstDateWithSkin(id: string): string {
  for (let offset = 1; offset < 120; offset++) {
    const t = new Date(Date.UTC(2026, 7, 31 + offset))
    const date = t.toISOString().slice(0, 10)
    if (skinFor(date, dailyPuzzle(date)).id === id) return date
  }
  throw new Error(`no ${id} date within range`)
}

test('bouncer days phrase the rule about patrons', async ({ page }) => {
  const date = firstDateWithSkin('bouncer')
  await page.goto(`/wason/?date=${date}`)
  await expect(page.getByTestId('rule')).toContainText('patron')
  await page.screenshot({
    path: 'test-results/skin-bouncer.png',
    fullPage: true,
  })
})

test('log days phrase the rule about requests', async ({ page }) => {
  const date = firstDateWithSkin('log')
  await page.goto(`/wason/?date=${date}`)
  await expect(page.getByTestId('rule')).toContainText('request')
  await page.screenshot({ path: 'test-results/skin-log.png', fullPage: true })
})

test('door days phrase the rule about rooms', async ({ page }) => {
  const date = firstDateWithSkin('doors')
  await page.goto(`/wason/?date=${date}`)
  await expect(page.getByTestId('rule')).toContainText('room')
  await page.screenshot({ path: 'test-results/skin-doors.png', fullPage: true })
})
