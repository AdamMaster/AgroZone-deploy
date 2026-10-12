import type { CategoryFeature } from '@/features/categories/types/category.types'

import { convertToCanonical, isConvertible } from './unit-conversion'

export type FeatureValues = Record<string, unknown>

// Служебные поля значения характеристики: выбранная единица и исходное
// значение продавца до пересчёта (для показа «130 л.с. (≈95.62 кВт)»).
const FEATURE_VALUE_SUFFIXES = ['__unit', '__sellerValue', '__sellerUnit'] as const

export const unitKey = (name: string) => `${name}__unit`

const baseFeatureName = (key: string): string =>
  FEATURE_VALUE_SUFFIXES.reduce((name, suffix) => (key.endsWith(suffix) ? key.slice(0, -suffix.length) : name), key)

// Сменили категорию — оставляем значения только тех характеристик, что есть
// в обеих категориях под тем же именем и с тем же типом; остальное —
// мусор прежней категории, на сервер он уйти не должен. Как
// reconcileCategoryFeatures сайта.
export function reconcileCategoryFeatures(
  values: FeatureValues | undefined,
  oldFeatures: readonly CategoryFeature[],
  newFeatures: readonly CategoryFeature[]
): FeatureValues {
  if (!values) return {}

  const oldTypeByName = new Map(oldFeatures.map(feature => [feature.name, feature.type]))
  const keptNames = new Set(
    newFeatures.filter(feature => oldTypeByName.get(feature.name) === feature.type).map(feature => feature.name)
  )

  return Object.fromEntries(Object.entries(values).filter(([key]) => keptNames.has(baseFeatureName(key))))
}

// Объявление открыли на правку — в полях то, что вводил продавец («130
// л.с.»), а не пересчитанное («95.62 кВт»); при сохранении
// normalizeFeatureUnits посчитает заново то же самое.
export function restoreSellerUnits(values: FeatureValues): FeatureValues {
  const result: FeatureValues = { ...values }

  for (const key of Object.keys(values)) {
    if (!key.endsWith('__sellerValue')) continue

    const name = key.slice(0, -'__sellerValue'.length)
    const sellerUnit = values[`${name}__sellerUnit`]
    if (typeof sellerUnit !== 'string') continue

    result[name] = values[key]
    result[unitKey(name)] = sellerUnit
    delete result[key]
    delete result[`${name}__sellerUnit`]
  }

  return result
}

// Перед отправкой числа с выбранной единицей приводятся к канонической
// (если величина одна), а исходное значение продавца запоминается рядом —
// как normalizeFeatureUnits сайта. После этого значение
// values[name] всегда выражено в единице values[name__unit].
export function normalizeFeatureUnits(
  values: FeatureValues | undefined,
  features: readonly CategoryFeature[]
): FeatureValues {
  if (!values) return {}

  const result: FeatureValues = { ...values }

  for (const feature of features) {
    if (feature.type !== 'NUMBER' || !feature.units?.length) continue

    const raw = values[feature.name]
    if (raw === null || raw === undefined || raw === '') continue

    const value = Number(raw)
    if (!Number.isFinite(value)) continue

    const canonicalUnit = feature.units[0]
    const chosenUnit = (values[unitKey(feature.name)] as string | undefined) ?? canonicalUnit
    const convertible = isConvertible(feature.units)
    const sellerValueKey = `${feature.name}__sellerValue`
    const sellerUnitKey = `${feature.name}__sellerUnit`

    result[feature.name] = convertible ? convertToCanonical(value, chosenUnit, canonicalUnit) : value
    result[unitKey(feature.name)] = convertible ? canonicalUnit : chosenUnit

    if (convertible && chosenUnit !== canonicalUnit) {
      result[sellerValueKey] = value
      result[sellerUnitKey] = chosenUnit
    } else {
      // Продавец выбрал каноническую единицу (в том числе вернул её при
      // повторной правке) — прежний «исходно введено в …» уже неверен.
      delete result[sellerValueKey]
      delete result[sellerUnitKey]
    }
  }

  return result
}
