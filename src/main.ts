import { dailyPuzzle, isValidDate, puzzleNumber, todayLocal } from './daily'
import {
  generateAudit,
  generateBroken,
  generateConnective,
  generateIdent,
  generateMultiAttr,
  generateRelational,
  generateVacuous,
  type Difficulty,
  type GeneratedPuzzle,
} from './engine/generate'
import { el, renderGame } from './game'
import { hashSeed } from './seed'
import { ABSTRACT, skinFor, type Skin } from './skins'
import {
  loadState,
  practiceStats,
  recordPractice,
  saveResult,
  streak,
  type DayResult,
} from './state'

const app = document.querySelector<HTMLDivElement>('#app')!

function applyAccent(skin: Skin): void {
  if (skin.accent)
    document.documentElement.style.setProperty('--accent', skin.accent)
  else document.documentElement.style.removeProperty('--accent')
}

function chrome(active: 'daily' | 'practice', metaText: string): HTMLElement {
  app.replaceChildren()
  const header = el('header')
  header.append(el('h1', undefined, 'Wason'))
  const meta = el('p', 'meta', metaText)
  meta.dataset.testid = 'meta'
  header.append(meta)

  const nav = el('nav', 'nav')
  const daily = el('a', undefined, 'Daily')
  daily.href = '#'
  if (active === 'daily') daily.setAttribute('aria-current', 'true')
  const practice = el('a', undefined, 'Practice')
  practice.href = '#practice'
  if (active === 'practice') practice.setAttribute('aria-current', 'true')
  nav.append(daily, practice)

  const view = el('div')
  const foot = el('footer')
  const link = el('a', undefined, 'Based on the Wason selection task.')
  link.href = 'https://en.wikipedia.org/wiki/Wason_selection_task'
  foot.append(link)

  app.append(header, nav, view, foot)
  return view
}

function dailyView(): void {
  const params = new URLSearchParams(location.search)
  const dateParam = params.get('date')
  const date = dateParam && isValidDate(dateParam) ? dateParam : todayLocal()
  const gen = dailyPuzzle(date)
  const skin = skinFor(date, gen)
  applyAccent(skin)
  const number = puzzleNumber(date)
  const metaText = () =>
    `#${number} · streak ${streak(loadState(localStorage).results, date)}`
  const view = chrome('daily', metaText())
  renderGame(view, {
    gen,
    skin,
    prior: loadState(localStorage).results[date],
    onFinish: (result) => {
      saveResult(localStorage, date, result)
      const meta = app.querySelector('.meta')
      if (meta) meta.textContent = metaText()
    },
    resultExtras: (result) => shareExtras(result, number, date),
  })
}

function shareExtras(
  result: DayResult,
  number: number,
  date: string,
): HTMLElement[] {
  const shareBtn = el('button', 'primary', 'Copy result')
  shareBtn.type = 'button'
  shareBtn.dataset.testid = 'share'
  const copied = el('span', 'count', '')
  shareBtn.addEventListener('click', () => {
    const s = streak(loadState(localStorage).results, date)
    const text = `Wason #${number} ${result.exact ? '✓' : '✗'} · streak ${s}\nsean-reid.github.io/wason`
    navigator.clipboard
      .writeText(text)
      .then(() => (copied.textContent = 'copied'))
      .catch(() => (copied.textContent = text))
  })
  return [shareBtn, copied]
}

const PRACTICE_KINDS = [
  { id: 'standard', label: 'Classic' },
  { id: 'multi', label: 'Faces' },
  { id: 'relational', label: 'Neighbors' },
  { id: 'audit', label: 'Two rules' },
  { id: 'ident', label: 'Which rule' },
  { id: 'trap', label: 'Traps' },
] as const

type PracticeKind = (typeof PRACTICE_KINDS)[number]['id']

let practiceKind: PracticeKind = 'standard'
let practiceDifficulty: Difficulty = 2
const practiceCounters = new Map<string, number>()

function practicePuzzle(
  kind: PracticeKind,
  difficulty: Difficulty,
  count: number,
): GeneratedPuzzle {
  const seed = hashSeed(`practice-${kind}-${difficulty}-${count}`)
  switch (kind) {
    case 'standard':
      return generateConnective(seed, difficulty)
    case 'multi':
      return generateMultiAttr(seed)
    case 'relational':
      return generateRelational(seed)
    case 'audit':
      return generateAudit(seed)
    case 'ident':
      return generateIdent(seed)
    case 'trap':
      return seed % 2 === 0 ? generateVacuous(seed, 3) : generateBroken(seed)
  }
}

function practiceView(): void {
  applyAccent(ABSTRACT)
  const metaText = () => {
    const stats = practiceStats(loadState(localStorage), practiceKind)
    return `practice · ${stats.played} played · ${stats.exact} exact`
  }
  const view = chrome('practice', metaText())

  const kindRow = el('div', 'controls')
  for (const k of PRACTICE_KINDS) {
    const chip = el('button', 'chip', k.label)
    chip.type = 'button'
    chip.dataset.kind = k.id
    chip.setAttribute('aria-pressed', practiceKind === k.id ? 'true' : 'false')
    chip.addEventListener('click', () => {
      practiceKind = k.id
      practiceView()
    })
    kindRow.append(chip)
  }
  view.append(kindRow)

  if (practiceKind === 'standard') {
    const diffRow = el('div', 'controls')
    for (const d of [1, 2, 3, 4, 5] as const) {
      const chip = el('button', 'chip', String(d))
      chip.type = 'button'
      chip.setAttribute(
        'aria-pressed',
        practiceDifficulty === d ? 'true' : 'false',
      )
      chip.addEventListener('click', () => {
        practiceDifficulty = d
        practiceView()
      })
      diffRow.append(chip)
    }
    view.append(diffRow)
  }

  const host = el('div')
  view.append(host)
  startPractice(host, metaText)
}

function startPractice(host: HTMLElement, metaText: () => string): void {
  const key = `${practiceKind}-${practiceDifficulty}`
  const count = practiceCounters.get(key) ?? 0
  const gen = practicePuzzle(practiceKind, practiceDifficulty, count)
  renderGame(host, {
    gen,
    skin: ABSTRACT,
    onFinish: (result) => {
      recordPractice(localStorage, practiceKind, result.exact)
      const meta = app.querySelector('.meta')
      if (meta) meta.textContent = metaText()
    },
    resultExtras: () => {
      const next = el('button', 'primary', 'Next puzzle')
      next.type = 'button'
      next.dataset.testid = 'next'
      next.addEventListener('click', () => {
        practiceCounters.set(key, count + 1)
        startPractice(host, metaText)
      })
      return [next]
    },
  })
}

function route(): void {
  if (location.hash === '#practice') practiceView()
  else dailyView()
}

window.addEventListener('hashchange', route)
route()
