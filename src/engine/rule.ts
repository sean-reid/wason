import type { Attrs, ItemProp, Rule } from './types'

export function evalProp(prop: ItemProp, attrs: Attrs): boolean {
  switch (prop.kind) {
    case 'pred': {
      const v = attrs[prop.pred.attr]
      if (v === undefined)
        throw new Error(`missing attribute ${prop.pred.attr}`)
      return prop.pred.values.includes(v)
    }
    case 'not':
      return !evalProp(prop.of, attrs)
    case 'and':
      return prop.of.every((p) => evalProp(p, attrs))
    case 'or':
      return prop.of.some((p) => evalProp(p, attrs))
    case 'implies':
      return !evalProp(prop.ante, attrs) || evalProp(prop.cons, attrs)
    case 'iff':
      return evalProp(prop.a, attrs) === evalProp(prop.b, attrs)
  }
}

export function evalRule(rule: Rule, allAttrs: readonly Attrs[]): boolean {
  return allAttrs.every((attrs) => evalProp(rule.prop, attrs))
}
