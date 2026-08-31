import { dailyPuzzle, isValidDate, puzzleNumber, todayLocal } from './daily'
import { evalProp } from './engine/rule'
import { solve } from './engine/solve'
import type { Item } from './engine/types'
import {
  BROKEN_FACE_EXPLANATION,
  INERT_EXPLANATION,
  IDENT_REQUIRED,
  IDENT_SAFE,
  IRRELEVANT_EXPLANATION,
  RELATIONAL_REQUIRED,
  RELATIONAL_SAFE,
  auditWitnessExplanation,
  multiWitnessExplanation,
  ruleSentence,
  witnessExplanation,
} from './phrase'
import { displayValue, skinFor } from './skins'
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
const skin = skinFor(date, gen)
const solution = solve(gen.puzzle)
const facesMode = gen.meta.kind === 'multi'
const relationalMode = gen.meta.kind === 'relational'
const identMode = gen.meta.kind === 'ident'
const auditMode = gen.meta.kind === 'audit'
const required = new Set<string>(
  facesMode
    ? solution.reveals.flatMap((r) => r.attrs.map((a) => `${r.item}:${a}`))
    : identMode
      ? gen.answer.map(String)
      : solution.reveals.map((r) => String(r.item)),
)
const number = puzzleNumber(date)
const broken = solution.status === 'already-false'
const vacuous = !broken && required.size === 0
const unit = facesMode ? 'face' : 'card'

function judgeExact(picked: readonly string[], claim?: Claim): boolean {
  if (broken) return claim === 'broken'
  if (vacuous) return claim === 'none'
  return (
    !claim &&
    picked.length === required.size &&
    picked.every((k) => required.has(k))
  )
}

if (skin.accent)
  document.documentElement.style.setProperty('--accent', skin.accent)

const selected = new Set<string>()
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

function hiddenAttrsOf(item: Item): string[] {
  return Object.keys(item.attrs).filter((id) => !item.shown.includes(id))
}

function faceContent(attrId: string, value: string | number): HTMLElement {
  if (skin.swatchAttrs.includes(attrId)) {
    const dot = el('span', `swatch c-${String(value)}`)
    dot.title = String(value)
    return dot
  }
  const text = displayValue(skin, attrId, value)
  return el('span', text.length > 3 ? 'val word' : 'val', text)
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

  if (auditMode || identMode) {
    const wrap = el('div', 'rulewrap')
    wrap.dataset.testid = 'rule'
    gen.meta.rules!.forEach((r, idx) => {
      wrap.append(
        el(
          'p',
          'rule',
          `${idx + 1}. ${ruleSentence(skin, r.form, r.a.id, r.b.id)}`,
        ),
      )
    })
    app.append(wrap)
  } else {
    const rule = el(
      'p',
      'rule',
      ruleSentence(skin, gen.meta.form, gen.meta.a.id, gen.meta.b.id),
    )
    rule.dataset.testid = 'rule'
    app.append(rule)
  }
  app.append(
    el(
      'p',
      'hint',
      facesMode
        ? 'Each card hides two faces. Flip exactly the faces that could prove this false.'
        : auditMode
          ? 'Both rules are in force. Flip exactly the cards that could prove either one false.'
          : relationalMode
            ? 'Order matters: the rule constrains neighbors. Flip exactly the cards that could prove it false.'
            : identMode
              ? 'Exactly one of these rules is in force. Flip exactly the cards guaranteed to reveal which.'
              : 'Flip exactly the cards that could prove this false. No more, no fewer.',
    ),
  )

  const grid = el('div', 'cards')
  gen.puzzle.items.forEach((item, i) => {
    const card = el(facesMode ? 'div' : 'button', 'card')
    if (card instanceof HTMLButtonElement) card.type = 'button'
    card.dataset.index = String(i)
    const shownAttr = item.shown[0]!
    const front = el('span', 'face front')
    front.append(faceContent(shownAttr, item.attrs[shownAttr]!))
    card.append(front)
    const hidden = hiddenAttrsOf(item)
    const back = el('span', hidden.length > 1 ? 'face back multi' : 'face back')
    for (const id of hidden) back.append(faceContent(id, item.attrs[id]!))
    card.append(back)

    if (!facesMode) {
      card.setAttribute('aria-pressed', 'false')
      card.addEventListener('click', () => {
        const key = String(i)
        if (selected.has(key)) selected.delete(key)
        else selected.add(key)
        card.setAttribute('aria-pressed', selected.has(key) ? 'true' : 'false')
        count.textContent = `${selected.size} selected`
      })
      grid.append(card)
      return
    }

    const stack = el('div', 'stack')
    const chips = el('div', 'chips')
    for (const id of hidden) {
      const chip = el('button', 'chip', skin.attrLabels[id] ?? id)
      chip.type = 'button'
      const key = `${i}:${id}`
      chip.dataset.key = key
      chip.setAttribute('aria-pressed', 'false')
      chip.addEventListener('click', () => {
        if (selected.has(key)) selected.delete(key)
        else selected.add(key)
        chip.setAttribute('aria-pressed', selected.has(key) ? 'true' : 'false')
        count.textContent = `${selected.size} selected`
      })
      chips.append(chip)
    }
    stack.append(card, chips)
    grid.append(stack)
  })
  app.append(grid)

  const actions = el('div', 'actions')
  const submit = el('button', 'primary', 'Submit')
  submit.type = 'button'
  submit.dataset.testid = 'submit'
  const count = el('span', 'count', '0 selected')
  const finish = (picked: string[], claim?: Claim) => {
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
    finish([...selected].sort())
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

function itemKeys(i: number): string[] {
  if (!facesMode) return [String(i)]
  return hiddenAttrsOf(gen.puzzle.items[i]!).map((id) => `${i}:${id}`)
}

function renderDone(result: DayResult): void {
  const meta = app.querySelector('.meta')
  if (meta)
    meta.textContent = `#${number} · streak ${streak(loadState(localStorage).results, date)}`
  const picked = new Set(result.picked.map(String))
  const cards = app.querySelectorAll<HTMLElement>('.card')
  cards.forEach((card, i) => {
    if (card instanceof HTMLButtonElement) card.disabled = true
    card.classList.add('revealed')
    if (!facesMode) {
      const key = String(i)
      card.setAttribute('aria-pressed', picked.has(key) ? 'true' : 'false')
      if (picked.has(key) !== required.has(key)) card.classList.add('wrong')
    }
    if (solution.perItem[i]!.kind === 'always-false')
      card.classList.add('broken')
  })
  app.querySelectorAll<HTMLButtonElement>('.chip').forEach((chip) => {
    chip.disabled = true
    const key = chip.dataset.key!
    if (picked.has(key) !== required.has(key)) chip.classList.add('wrong')
  })
  app.querySelector('.actions')?.remove()
  app.querySelector('.claims')?.remove()
  app.querySelector('.verdict')?.remove()
  app.querySelector('.explain')?.remove()
  app.querySelector('.share')?.remove()

  const missed = [...required].filter((k) => !picked.has(k)).length
  const extra = [...picked].filter((k) => !required.has(k)).length
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
        el('p', 'sub', `You flipped only the ${unit}s that mattered.`),
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
        `You missed ${missed} required ${unit}${missed === 1 ? '' : 's'}.`,
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
          : `Every required ${unit}, plus ${extra} that could tell you nothing.`,
      ),
    )
  }
  if (identMode) {
    verdict.append(
      el('p', 'sub', `Rule ${gen.meta.inForce! + 1} was in force.`),
    )
  }
  if (!broken && !identMode) {
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
    const keys = itemKeys(i)
    const itemRight = keys.every((k) => picked.has(k) === required.has(k))
    const line = el('li', itemRight ? 'right' : 'missed')
    const shownAttr = item.shown[0]!
    const face = displayValue(skin, shownAttr, item.attrs[shownAttr]!)
    let text: string
    if (broken) {
      text =
        report.kind === 'always-false'
          ? BROKEN_FACE_EXPLANATION
          : IRRELEVANT_EXPLANATION
    } else if (identMode) {
      text = required.has(String(i)) ? IDENT_REQUIRED : IDENT_SAFE
    } else if (relationalMode) {
      text =
        report.kind === 'contingent' ? RELATIONAL_REQUIRED : RELATIONAL_SAFE
    } else if (report.kind !== 'contingent') {
      text = INERT_EXPLANATION
    } else if (facesMode) {
      text = multiWitnessExplanation(
        skin,
        report.minimalReveals![0]!,
        report.witness!,
      )
    } else if (auditMode && gen.puzzle.rule.kind === 'every-item') {
      const prop = gen.puzzle.rule.prop
      const subs = prop.kind === 'and' ? prop.of : [prop]
      const nums = subs.flatMap((p, idx) =>
        evalProp(p, report.witness!) ? [] : [idx + 1],
      )
      const hidden = hiddenAttrsOf(item)[0]!
      text = auditWitnessExplanation(
        skin,
        hidden,
        report.witness![hidden]!,
        nums,
      )
    } else {
      const hidden = hiddenAttrsOf(item)[0]!
      text = witnessExplanation(skin, hidden, report.witness![hidden]!)
    }
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
