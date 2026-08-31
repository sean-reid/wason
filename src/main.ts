import { dailyPuzzle, isValidDate, puzzleNumber, todayLocal } from './daily'
import { solve } from './engine/solve'
import type { Item } from './engine/types'
import {
  INERT_EXPLANATION,
  faceText,
  ruleSentence,
  witnessExplanation,
} from './phrase'
import { loadState, saveResult, streak, type DayResult } from './state'

const params = new URLSearchParams(location.search)
const dateParam = params.get('date')
const date = dateParam && isValidDate(dateParam) ? dateParam : todayLocal()
const gen = dailyPuzzle(date)
const solution = solve(gen.puzzle)
const required = new Set(gen.answer)
const number = puzzleNumber(date)

const selected = new Set<number>()
const app = document.querySelector<HTMLDivElement>('#app')!

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function hiddenAttrOf(item: Item): string {
  return Object.keys(item.attrs).find((id) => !item.shown.includes(id))!
}

function facePiece(
  attrId: string,
  value: string | number,
  cls: string,
): HTMLElement {
  if (attrId === 'color') {
    const wrap = el('span', `face ${cls}`)
    const dot = el('span', `swatch c-${String(value)}`)
    dot.title = String(value)
    wrap.append(dot)
    return wrap
  }
  return el('span', `face ${cls}`, faceText(value))
}

function render(): void {
  app.replaceChildren()

  const header = el('header')
  header.append(el('h1', undefined, 'Wason'))
  const state = loadState(localStorage)
  const meta = el(
    'p',
    'meta',
    `#${number} · streak ${streak(state.results, date)}`,
  )
  meta.dataset.testid = 'meta'
  header.append(meta)
  app.append(header)

  const rule = el(
    'p',
    'rule',
    ruleSentence(gen.meta.form, gen.meta.a.id, gen.meta.b.id),
  )
  rule.dataset.testid = 'rule'
  app.append(rule)
  app.append(
    el(
      'p',
      'hint',
      'Flip exactly the cards that could prove this false. No more, no fewer.',
    ),
  )

  const grid = el('div', 'cards')
  gen.puzzle.items.forEach((item, i) => {
    const card = el('button', 'card')
    card.type = 'button'
    card.dataset.index = String(i)
    card.setAttribute('aria-pressed', 'false')
    const shownAttr = item.shown[0]!
    card.append(facePiece(shownAttr, item.attrs[shownAttr]!, 'front'))
    const hidden = hiddenAttrOf(item)
    card.append(facePiece(hidden, item.attrs[hidden]!, 'back'))
    card.addEventListener('click', () => {
      if (selected.has(i)) selected.delete(i)
      else selected.add(i)
      card.setAttribute('aria-pressed', selected.has(i) ? 'true' : 'false')
      count.textContent = `${selected.size} selected`
    })
    grid.append(card)
  })
  app.append(grid)

  const actions = el('div', 'actions')
  const submit = el('button', 'primary', 'Submit')
  submit.type = 'button'
  submit.dataset.testid = 'submit'
  const count = el('span', 'count', '0 selected')
  submit.addEventListener('click', () => {
    const picked = [...selected].sort((a, b) => a - b)
    const exact =
      picked.length === required.size && picked.every((i) => required.has(i))
    const result: DayResult = { picked, exact }
    saveResult(localStorage, date, result)
    renderDone(result)
  })
  actions.append(submit, count)
  app.append(actions)

  const foot = el('footer')
  const link = el('a', undefined, 'Based on the Wason selection task.')
  link.href = 'https://en.wikipedia.org/wiki/Wason_selection_task'
  foot.append(link)
  app.append(foot)

  const prior = state.results[date]
  if (prior) renderDone(prior)
}

function renderDone(result: DayResult): void {
  const meta = app.querySelector('.meta')
  if (meta)
    meta.textContent = `#${number} · streak ${streak(loadState(localStorage).results, date)}`
  const picked = new Set(result.picked)
  const cards = app.querySelectorAll<HTMLButtonElement>('.card')
  cards.forEach((card, i) => {
    card.disabled = true
    card.classList.add('revealed')
    card.setAttribute('aria-pressed', picked.has(i) ? 'true' : 'false')
    if (picked.has(i) !== required.has(i)) card.classList.add('wrong')
  })
  app.querySelector('.actions')?.remove()
  app.querySelector('.verdict')?.remove()
  app.querySelector('.explain')?.remove()
  app.querySelector('.share')?.remove()

  const missed = [...required].filter((i) => !picked.has(i)).length
  const extra = [...picked].filter((i) => !required.has(i)).length
  const verdict = el('section', 'verdict')
  verdict.dataset.testid = 'verdict'
  if (result.exact) {
    verdict.append(el('h2', undefined, 'Exact.'))
    verdict.append(el('p', 'sub', 'You flipped only the cards that mattered.'))
  } else if (missed > 0) {
    verdict.append(el('h2', undefined, 'Not proven.'))
    verdict.append(
      el(
        'p',
        'sub',
        `You missed ${missed} required card${missed === 1 ? '' : 's'}.`,
      ),
    )
  } else {
    verdict.append(el('h2', undefined, 'Proven, but wasteful.'))
    verdict.append(
      el(
        'p',
        'sub',
        `Every required card, plus ${extra} that could tell you nothing.`,
      ),
    )
  }
  verdict.append(
    el(
      'p',
      'sub',
      gen.meta.ruleHolds
        ? 'The hidden faces did obey the rule today.'
        : 'And the backs show the rule was in fact false today.',
    ),
  )

  const explain = el('ul', 'explain')
  gen.puzzle.items.forEach((item, i) => {
    const report = solution.perItem[i]!
    const line = el(
      'li',
      picked.has(i) === required.has(i) ? 'right' : 'missed',
    )
    const shownAttr = item.shown[0]!
    const face =
      shownAttr === 'color'
        ? String(item.attrs[shownAttr])
        : faceText(item.attrs[shownAttr]!)
    const text =
      report.kind === 'contingent'
        ? witnessExplanation(
            hiddenAttrOf(item),
            report.witness![hiddenAttrOf(item)]!,
          )
        : INERT_EXPLANATION
    line.textContent = `${face} · ${text}`
    explain.append(line)
  })

  const share = el('div', 'share')
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
  share.append(shareBtn, copied)

  app.querySelector('footer')!.before(verdict, explain, share)
}

render()
