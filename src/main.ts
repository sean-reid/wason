import {
  DAY_ONE,
  dailyPuzzle,
  dateOfNumber,
  isValidDate,
  puzzleNumber,
  todayLocal,
} from './daily'
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
  currentStreak,
  loadState,
  markKindSeen,
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

type View = 'daily' | 'practice' | 'archive' | 'how'

const NAV: readonly [View, string, string][] = [
  ['daily', 'Daily', './'],
  ['practice', 'Practice', '#practice'],
  ['archive', 'Archive', '#archive'],
  ['how', 'How to play', '#how'],
]

function chrome(active: View, metaText: string): HTMLElement {
  app.replaceChildren()
  const header = el('header')
  header.append(el('h1', undefined, 'Wason'))
  const meta = el('p', 'meta', metaText)
  meta.dataset.testid = 'meta'
  header.append(meta)

  const nav = el('nav', 'nav')
  for (const [id, label, href] of NAV) {
    const a = el('a', undefined, label)
    a.href = href
    if (active === id) a.setAttribute('aria-current', 'true')
    nav.append(a)
  }

  const view = el('main')
  const foot = el('footer')
  const link = el('a', undefined, 'Based on the Wason selection task.')
  link.href = 'https://en.wikipedia.org/wiki/Wason_selection_task'
  foot.append(link)

  app.append(header, nav, view, foot)
  return view
}

const PRIMER_DESCRIPTIONS: Readonly<Record<string, [PracticeKind, string]>> = {
  multi: ['multi', 'cards hide two faces, and a pick is a card plus a face'],
  relational: ['relational', 'the rule is about neighboring cards'],
  audit: ['audit', 'two rules are in force at once'],
  ident: ['ident', 'you must work out which rule is in force'],
}

function dailyView(): void {
  const params = new URLSearchParams(location.search)
  const dateParam = params.get('date')
  const requested =
    dateParam && isValidDate(dateParam) ? dateParam : todayLocal()
  const date = puzzleNumber(requested) < 1 ? DAY_ONE : requested
  const gen = dailyPuzzle(date)
  const skin = skinFor(date, gen)
  applyAccent(skin)
  const number = puzzleNumber(date)
  const state = loadState(localStorage)
  const prior = state.results[date]
  const metaText = () =>
    `#${number} · streak ${currentStreak(loadState(localStorage).results, date)}`
  const view = chrome('daily', metaText())

  const primer = PRIMER_DESCRIPTIONS[gen.meta.kind]
  if (primer && !prior && !state.seenKinds.includes(gen.meta.kind)) {
    const p = el('p', 'primer')
    p.dataset.testid = 'primer'
    p.append(`New today: ${primer[1]}. `)
    const a = el('a', undefined, 'Practice this kind first')
    a.href = `#practice/${primer[0]}`
    p.append(a)
    view.append(p)
  }

  const host = el('div')
  view.append(host)
  renderGame(host, {
    gen,
    skin,
    prior,
    onFinish: (result) => {
      saveResult(localStorage, date, result)
      markKindSeen(localStorage, gen.meta.kind)
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
const practiceCounters = new Map<string, number>()

function practicePuzzle(kind: PracticeKind, count: number): GeneratedPuzzle {
  const seed = hashSeed(`practice-${kind}-${count}`)
  switch (kind) {
    case 'standard':
      return generateConnective(seed, ((count % 5) + 1) as Difficulty)
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
  view.append(el('p', 'hint', 'Endless. Classic ramps up as you go.'))

  const host = el('div')
  view.append(host)
  startPractice(host, metaText)
}

function startPractice(host: HTMLElement, metaText: () => string): void {
  const key = practiceKind
  const count = practiceCounters.get(key) ?? 0
  const gen = practicePuzzle(practiceKind, count)
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

function archiveView(): void {
  applyAccent(ABSTRACT)
  const view = chrome('archive', 'archive')
  const results = loadState(localStorage).results
  const list = el('div', 'archive')
  for (let n = puzzleNumber(todayLocal()); n >= 1; n--) {
    const date = dateOfNumber(n)
    const r = results[date]
    const row = el('a', 'row')
    row.href = `?date=${date}`
    row.append(
      el('span', 'num', `#${n}`),
      el('span', undefined, date),
      status(r),
    )
    list.append(row)
  }
  view.append(list)
}

function status(r: DayResult | undefined): HTMLElement {
  const span = el(
    'span',
    r ? (r.exact ? 'st-exact' : 'st-fail') : 'st-open',
    r ? (r.exact ? '✓' : '✗') : '·',
  )
  span.setAttribute(
    'aria-label',
    r ? (r.exact ? 'solved' : 'missed') : 'not played',
  )
  return span
}

function howView(): void {
  applyAccent(ABSTRACT)
  const view = chrome('how', 'how to play')
  view.append(el('p', 'rule', 'Prove the rule, or say why you cannot.'))
  const prose = [
    'Each day states a rule about a row of cards and their hidden backs. Select exactly what could prove the rule false, no more and no fewer, then submit. One try per day, and the day rolls over at your local midnight.',
    'The classic mistake is flipping the card the rule mentions instead of the card that could break it. "If a card has a vowel, it has an even number" is broken only by a vowel with an odd back, so the vowel and the odd number matter and the even number never does.',
    'Some days no flip helps. If nothing could break the rule, submit with no cards selected and claim it. If a visible face already breaks the rule, flag that instead.',
    'The week ramps up: gentle Mondays, identification Wednesdays, neighbor rules Fridays, two-face cards Saturdays, double rules Sundays, and the odd trap in between. On those days the picks change shape, and the hint above the cards says how.',
    'Your streak counts consecutive days solved exactly. Try one below; examples never touch your streak.',
  ]
  prose.forEach((t, i) =>
    view.append(el('p', i === 0 ? 'prose lead' : 'prose', t)),
  )
  const host = el('div')
  view.append(host)
  startTutorial(host, 0)
}

function startTutorial(host: HTMLElement, i: number): void {
  const gen = generateConnective(hashSeed(`tutorial-${i}`), 1)
  renderGame(host, {
    gen,
    skin: ABSTRACT,
    onFinish: () => {},
    resultExtras: () => {
      const next = el('button', 'primary', 'Another example')
      next.type = 'button'
      next.dataset.testid = 'another'
      next.addEventListener('click', () => startTutorial(host, i + 1))
      return [next]
    },
  })
}

function route(): void {
  const hash = location.hash
  if (hash.startsWith('#practice')) {
    const kindParam = hash.split('/')[1]
    if (kindParam && PRACTICE_KINDS.some((k) => k.id === kindParam)) {
      practiceKind = kindParam as PracticeKind
    }
    practiceView()
  } else if (hash === '#archive') archiveView()
  else if (hash === '#how') howView()
  else dailyView()
}

function renderCrash(): void {
  app.replaceChildren()
  const header = el('header')
  header.append(el('h1', undefined, 'Wason'))
  app.append(header)
  app.append(el('p', 'rule', 'Something broke.'))
  app.append(
    el(
      'p',
      'prose lead',
      'Saved data on this device may be damaged. Clearing it usually fixes this.',
    ),
  )
  const reset = el('button', 'primary', 'Clear saved data and reload')
  reset.type = 'button'
  reset.addEventListener('click', () => {
    try {
      localStorage.removeItem('wason')
    } catch {
      // storage unavailable; reload anyway
    }
    location.reload()
  })
  app.append(reset)
}

function safeRoute(): void {
  try {
    route()
  } catch {
    renderCrash()
  }
}

window.addEventListener('hashchange', safeRoute)
safeRoute()
