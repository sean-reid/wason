import { expect, test } from '@playwright/test'
import { dailyPuzzle } from '../src/daily'
import { generateConnective } from '../src/engine/generate'
import { hashSeed } from '../src/seed'
import { firstDateOf, playExact } from './helpers'

test('vacuous day: wrongly flagging a violation fails', async ({ page }) => {
  await page.goto(`/wason/?date=${firstDateOf('vacuous')}`)
  await page.getByTestId('submit').click()
  await page.getByTestId('claim-broken').click()
  await expect(page.getByTestId('verdict')).toContainText('Nothing was broken.')
})

test('broken day: wrongly claiming nothing could break it fails', async ({
  page,
}) => {
  await page.goto(`/wason/?date=${firstDateOf('broken')}`)
  await page.getByTestId('submit').click()
  await page.getByTestId('claim-none').click()
  await expect(page.getByTestId('verdict')).toContainText(
    'It was already broken.',
  )
})

test('deselection and the selected count stay in sync', async ({ page }) => {
  await page.goto(`/wason/?date=${firstDateOf('standard')}`)
  const card = page.locator('.card[data-index="0"]')
  await card.click()
  await expect(page.locator('.count').first()).toHaveText('1 selected')
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await card.click()
  await expect(page.locator('.count').first()).toHaveText('0 selected')
  await expect(card).toHaveAttribute('aria-pressed', 'false')
})

test('a solved three-sided day restores after reload with marks intact', async ({
  page,
}) => {
  const date = firstDateOf('multi')
  await page.goto(`/wason/?date=${date}`)
  await playExact(page, date)
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await page.reload()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await expect(page.locator('.chip.wrong')).toHaveCount(0)
  await expect(page.getByTestId('submit')).toHaveCount(0)
})

test('a claimed trap day restores after reload', async ({ page }) => {
  const date = firstDateOf('vacuous')
  await page.goto(`/wason/?date=${date}`)
  await playExact(page, date)
  await page.reload()
  await expect(page.getByTestId('verdict')).toContainText('Exact.')
  await expect(page.getByTestId('submit')).toHaveCount(0)
})

test('explanations use the mode-specific wording', async ({ page }) => {
  const relational = firstDateOf('relational')
  await page.goto(`/wason/?date=${relational}`)
  await playExact(page, relational)
  await expect(page.locator('.explain')).toContainText(
    'cannot be settled without this face',
  )
  await expect(page.getByTestId('verdict')).toContainText(
    /hidden faces did obey|in fact false/,
  )

  const ident = firstDateOf('ident')
  await page.goto(`/wason/?date=${ident}`)
  await playExact(page, ident)
  await expect(page.locator('.explain')).toContainText('tell the rules apart')
  await expect(page.getByTestId('verdict')).toContainText('fails at the')
})

test('a failed day shares with a cross', async ({ page }) => {
  const date = firstDateOf('standard')
  const gen = dailyPuzzle(date)
  const wrong = gen.puzzle.items
    .map((_, i) => i)
    .filter((i) => !gen.answer.includes(i))
  await page.goto(`/wason/?date=${date}`)
  await page.locator(`.card[data-index="${wrong[0]}"]`).click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('verdict')).toContainText('Not proven.')
  await page.getByTestId('share').click()
  await expect(page.locator('.share .count')).toContainText('✗')
})

test('practice records failures and next serves a different puzzle', async ({
  page,
}) => {
  await page.goto('/wason/#practice')
  const first = generateConnective(hashSeed('practice-standard-0'), 1)
  const wrong = first.puzzle.items
    .map((_, i) => i)
    .filter((i) => !first.answer.includes(i))
  await page.locator(`.card[data-index="${wrong[0]}"]`).click()
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('meta')).toContainText('1 played · 0 exact')
  const firstRule = await page.getByTestId('rule').textContent()
  await page.getByTestId('next').click()
  await expect(page.getByTestId('rule')).not.toHaveText(firstRule ?? '')
})
