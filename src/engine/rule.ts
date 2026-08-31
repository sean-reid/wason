import type { Attrs, ItemProp, Pred, Rule } from './types'

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

function evalPred(pred: Pred, attrs: Attrs): boolean {
  const v = attrs[pred.attr]
  if (v === undefined) throw new Error(`missing attribute ${pred.attr}`)
  return pred.values.includes(v)
}

export function evalRule(rule: Rule, allAttrs: readonly Attrs[]): boolean {
  switch (rule.kind) {
    case 'every-item':
      return allAttrs.every((attrs) => evalProp(rule.prop, attrs))
    case 'adjacent': {
      const { variant, a, b } = rule
      if (variant === 'right-of') {
        return allAttrs.every(
          (attrs, i) =>
            !evalPred(a, attrs) ||
            (i + 1 < allAttrs.length && evalPred(b, allAttrs[i + 1]!)),
        )
      }
      return allAttrs.every(
        (attrs, i) =>
          i + 1 >= allAttrs.length ||
          (!(evalPred(a, attrs) && evalPred(b, allAttrs[i + 1]!)) &&
            !(evalPred(b, attrs) && evalPred(a, allAttrs[i + 1]!))),
      )
    }
  }
}
