import type { AttributeDef, Attrs, AttrValue, Item } from './types'

export function completions(
  item: Item,
  attributes: readonly AttributeDef[],
): Attrs[] {
  const hidden = attributes.filter(
    (a) => a.id in item.attrs && !item.shown.includes(a.id),
  )
  const base: Record<string, AttrValue> = {}
  for (const id of item.shown) base[id] = item.attrs[id]!
  let out: Record<string, AttrValue>[] = [base]
  for (const attr of hidden) {
    out = out.flatMap((acc) =>
      attr.domain.map((v) => ({ ...acc, [attr.id]: v })),
    )
  }
  return out
}

export interface WorldTable {
  per: Attrs[][]
  sizes: number[]
  strides: number[]
  count: number
}

export function buildWorlds(
  items: readonly Item[],
  attributes: readonly AttributeDef[],
): WorldTable {
  const per = items.map((it) => completions(it, attributes))
  const sizes = per.map((c) => c.length)
  const strides = sizes.map((_, i) =>
    sizes.slice(0, i).reduce((x, y) => x * y, 1),
  )
  const count = sizes.reduce((x, y) => x * y, 1)
  return { per, sizes, strides, count }
}

export function worldDigit(table: WorldTable, w: number, i: number): number {
  return Math.floor(w / table.strides[i]!) % table.sizes[i]!
}

// A reveal mask settles the question iff every class of worlds agreeing on
// the revealed items carries a single label. Worlds labelled -1 are skipped.
export function maskSettles(
  table: WorldTable,
  mask: number,
  labelAt: (w: number) => number,
): boolean {
  const members: number[] = []
  for (let i = 0; i < table.sizes.length; i++)
    if (mask & (1 << i)) members.push(i)
  const subStrides: number[] = []
  let acc = 1
  for (const i of members) {
    subStrides.push(acc)
    acc *= table.sizes[i]!
  }
  const seen = new Map<number, number>()
  for (let w = 0; w < table.count; w++) {
    const label = labelAt(w)
    if (label < 0) continue
    let key = 0
    for (let k = 0; k < members.length; k++) {
      key += worldDigit(table, w, members[k]!) * subStrides[k]!
    }
    const prev = seen.get(key)
    if (prev === undefined) seen.set(key, label)
    else if (prev !== label) return false
  }
  return true
}

export function popcount(x: number): number {
  let c = 0
  for (let v = x; v > 0; v >>= 1) c += v & 1
  return c
}

export function minimalMasks(
  n: number,
  sufficient: (mask: number) => boolean,
): number[] {
  const masks = Array.from({ length: 1 << n }, (_, m) => m).sort(
    (a, b) => popcount(a) - popcount(b),
  )
  const minimals: number[] = []
  for (const mask of masks) {
    if (minimals.some((m) => (m & mask) === m)) continue
    if (sufficient(mask)) minimals.push(mask)
  }
  return minimals
}
