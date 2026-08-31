import type { RelationalForm, RuleForm } from './engine/generate'
import type { Attrs, AttrValue } from './engine/types'
import { displayValue, type Skin } from './skins'

export function ruleSentence(
  skin: Skin,
  form: RuleForm | RelationalForm,
  aId: string,
  bId: string,
): string {
  const vp = (id: string) => {
    const voice = skin.preds[id]
    if (!voice) throw new Error(`skin ${skin.id} cannot phrase ${id}`)
    return voice.vp
  }
  const neg = (id: string) => skin.preds[id]!.neg
  const { noun, pronoun } = skin
  switch (form) {
    case 'if-then':
      return `If a ${noun} ${vp(aId)}, ${pronoun} ${vp(bId)}.`
    case 'only-if':
      return `A ${noun} ${vp(aId)} only if ${pronoun} ${vp(bId)}.`
    case 'if-then-not':
      return `If a ${noun} ${vp(aId)}, ${pronoun} ${neg(bId)}.`
    case 'if-not-then':
      return `If a ${noun} ${neg(aId)}, ${pronoun} ${vp(bId)}.`
    case 'or':
      return `Every ${noun} ${vp(aId)} or ${vp(bId)}.`
    case 'unless':
      return `Every ${noun} ${vp(aId)} unless ${pronoun} ${vp(bId)}.`
    case 'iff':
      return `A ${noun} ${vp(aId)} if and only if ${pronoun} ${vp(bId)}.`
    case 'right-of':
      return `Every ${noun} that ${vp(aId)} is immediately followed by one that ${vp(bId)}.`
    case 'never-adjacent':
      return `A ${noun} that ${vp(aId)} is never next to another that ${vp(bId)}.`
  }
}

export function witnessExplanation(
  skin: Skin,
  attrId: string,
  value: AttrValue,
): string {
  return `Required: ${displayValue(skin, attrId, value)} on the back would break the rule.`
}

export const INERT_EXPLANATION = 'Safe: nothing on the back can break the rule.'

export const BROKEN_FACE_EXPLANATION =
  'Breaks the rule face-up. No flip needed.'

export const IRRELEVANT_EXPLANATION = 'Irrelevant: the rule was already broken.'

export function multiWitnessExplanation(
  skin: Skin,
  attrIds: readonly string[],
  witness: Attrs,
): string {
  const label = (id: string) => skin.attrLabels[id] ?? id
  const val = (id: string) => displayValue(skin, id, witness[id]!)
  if (attrIds.length === 1) {
    const id = attrIds[0]!
    return `Required: the ${label(id)} face (${val(id)} there would break the rule).`
  }
  const [x, y] = attrIds as [string, string]
  return `Required: both the ${label(x)} and ${label(y)} faces (${val(x)} with ${val(y)} would break the rule).`
}

export function auditWitnessExplanation(
  skin: Skin,
  attrId: string,
  value: AttrValue,
  ruleNums: readonly number[],
): string {
  const which =
    ruleNums.length > 1
      ? `rules ${ruleNums.join(' and ')}`
      : `rule ${ruleNums[0]}`
  return `Required: ${displayValue(skin, attrId, value)} on the back would break ${which}.`
}

export const RELATIONAL_REQUIRED =
  'Required: the rule cannot be settled without this face.'

export const RELATIONAL_SAFE = 'Safe: this face cannot change the outcome.'

export const IDENT_REQUIRED =
  'Required: identification is not guaranteed without this face.'

export const IDENT_SAFE = 'Safe: this face cannot help tell the rules apart.'
