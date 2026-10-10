import type { CategoryFeature } from '../types/category.types'

// Плавающая точка при пересчёте единиц даёт что-то вроде 95.61500000000001 —
// округляем при показе, как сайт.
const roundDisplayNumber = (value: number) => Math.round(value * 100) / 100

// Значение характеристики объявления для показа — как formatFeatureValue
// сайта (client/src/shared/utils/format-feature-value.ts). features — все
// характеристики объявления целиком: у чисел рядом лежат служебные поля
// «<name>__unit» и «<name>__sellerValue»/«<name>__sellerUnit». null —
// характеристика не заполнена.
export function formatFeatureValue(feature: CategoryFeature, features: Record<string, unknown>): string | null {
  const value = features[feature.name]

  if (value === null || value === undefined || value === '') return null
  if (feature.type === 'BOOLEAN') return value ? 'Да' : 'Нет'

  if (Array.isArray(value)) {
    if (!value.length) return null

    // Число может храниться списком (несколько калибров): единицу ставим
    // один раз в конце.
    const joined = value.join(', ')
    if (feature.type !== 'NUMBER') return joined

    const unit = feature.units?.[0]
    return unit ? `${joined} ${unit}` : joined
  }

  if (feature.type !== 'NUMBER') return String(value)

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value)

  const storedUnit = features[`${feature.name}__unit`]
  const unit = typeof storedUnit === 'string' ? storedUnit : feature.units?.[0]
  const rounded = roundDisplayNumber(numericValue)
  const canonicalText = unit ? `${rounded} ${unit}` : String(rounded)

  // Продавец вводил в другой единице (130 л.с., а не 95.62 кВт) —
  // показываем его число, а пересчёт — справочно в скобках.
  const sellerValue = features[`${feature.name}__sellerValue`]
  const sellerUnit = features[`${feature.name}__sellerUnit`]

  if (typeof sellerValue === 'number' && typeof sellerUnit === 'string') {
    return `${roundDisplayNumber(sellerValue)} ${sellerUnit} (≈${canonicalText})`
  }

  return canonicalText
}
