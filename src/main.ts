import { dailyPuzzle, isValidDate, puzzleNumber, todayLocal } from './daily'
import { solve } from './engine/solve'
import type { Item } from './engine/types'
import {
  BROKEN_FACE_EXPLANATION,
  INERT_EXPLANATION,
  IRRELEVANT_EXPLANATION,
  faceText,
  ruleSentence,
  witnessExplanation,
} from './phrase'
import {
  loadState,
  saveResult,
  streak,
  type Claim,
  type DayResult,
} from './state'

const params = new URLSearchParams(location.search)
const dateParam = params.get('date')
const date = dateParam && isValidDate(dateParam) ? dateParam : todayLocal()
const gen = dailyPuzzle(date)
const solution = solve(gen.puzzle)
const required = new Set(gen.answer)
const number = puzzleNumber(date)
const broken = solution.status === 'already-false'
const vacuous = !broken && required.size === 0

function judgeExact(picked: readonly number[], claim?: Claim): boolean {
  if (broken) return claim === 'broken'
  if (vacuous) return claim === 'none'
  return (
    !claim &&
    picked.length === required.size &&
    picked.every((i) => required.has(i))
  )
}

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
  const finish = (picked: number[], claim?: Claim) => {
    const result: DayResult = {
      picked,
      exact: judgeExact(picked, claim),
      claim,
    }
    saveResult(localStorage, date, result)
    renderDone(result)
  }
  submit.addEventListener('click', () => {
    if (selected.size === 0) {
      if (app.querySelector('.claims')) return
      const claims = el('div', 'claims')
      claims.append(el('p', 'hint', 'No flips is a claim. Which one?'))
      const row = el('div', 'actions')
      const none = el('button', 'secondary', 'Nothing could break it')
      none.type = 'button'
      none.dataset.testid = 'claim-none'
      none.addEventListener('click', () => finish([], 'none'))
      const flag = el('button', 'secondary', 'It is already broken')
      flag.type = 'button'
      flag.dataset.testid = 'claim-broken'
      flag.addEventListener('click', () => finish([], 'broken'))
      row.append(none, flag)
      claims.append(row)
      actions.after(claims)
      return
    }
    finish([...selected].sort((a, b) => a - b))
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
    if (solution.perItem[i]!.kind === 'always-false')
      card.classList.add('broken')
  })
  app.querySelector('.actions')?.remove()
  app.querySelector('.claims')?.remove()
  app.querySelector('.verdict')?.remove()
  app.querySelector('.explain')?.remove()
  app.querySelector('.share')?.remove()

  const missed = [...required].filter((i) => !picked.has(i)).length
  const extra = [...picked].filter((i) => !required.has(i)).length
  const verdict = el('section', 'verdict')
  verdict.dataset.testid = 'verdict'
  if (result.exact) {
    if (broken) {
      verdict.append(el('h2', undefined, 'Sharp eye.'))
      verdict.append(el('p', 'sub', 'The rule was already false on the table.'))
    } else if (vacuous) {
      verdict.append(el('h2', undefined, 'Exact.'))
      verdict.append(
        el('p', 'sub', 'No card could have hidden a counterexample.'),
      )
    } else {
      verdict.append(el('h2', undefined, 'Exact.'))
      verdict.append(
        el('p', 'sub', 'You flipped only the cards that mattered.'),
      )
    }
  } else if (result.claim === 'broken') {
    verdict.append(el('h2', undefined, 'Nothing was broken.'))
    verdict.append(
      el('p', 'sub', 'Every visible face is consistent with the rule.'),
    )
  } else if (broken) {
    verdict.append(el('h2', undefined, 'It was already broken.'))
    verdict.append(
      el('p', 'sub', 'One visible face violated the rule before any flip.'),
    )
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
        vacuous
          ? `No flip was needed; ${extra} could tell you nothing.`
          : `Every required card, plus ${extra} that could tell you nothing.`,
      ),
    )
  }
  if (!broken) {
    verdict.append(
      el(
        'p',
        'sub',
        gen.meta.ruleHolds
          ? 'The hidden faces did obey the rule today.'
          : 'And the backs show the rule was in fact false today.',
      ),
    )
  }

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
    const text = broken
      ? report.kind === 'always-false'
        ? BROKEN_FACE_EXPLANATION
        : IRRELEVANT_EXPLANATION
      : report.kind === 'contingent'
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
