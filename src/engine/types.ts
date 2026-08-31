export type AttrValue = string | number

export interface AttributeDef {
  id: string
  domain: readonly AttrValue[]
}

export interface Pred {
  id: string
  attr: string
  values: readonly AttrValue[]
}

export type ItemProp =
  | { kind: 'pred'; pred: Pred }
  | { kind: 'not'; of: ItemProp }
  | { kind: 'and'; of: readonly ItemProp[] }
  | { kind: 'or'; of: readonly ItemProp[] }
  | { kind: 'implies'; ante: ItemProp; cons: ItemProp }
  | { kind: 'iff'; a: ItemProp; b: ItemProp }

export interface Rule {
  kind: 'every-item'
  prop: ItemProp
}

export type Attrs = Readonly<Record<string, AttrValue>>

export interface Item {
  attrs: Attrs
  shown: readonly string[]
}

export interface Puzzle {
  attributes: readonly AttributeDef[]
  items: readonly Item[]
  rule: Rule
}
