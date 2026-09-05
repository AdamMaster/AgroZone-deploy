import type { ICategoryFeature } from '@/components/features/ads/types/ad.types'

// Плавающая точка (см. unit-conversion.ts) может дать что-то вроде
// 95.61500000000001 даже после округления при сохранении — старые
// объявления, сохранённые до этого исправления (задача U3, ROADMAP.md),
// всё ещё хранят "сырое" значение. Округляем и на выводе тоже, чтобы
// такие объявления сразу выглядели поправленными, без миграции данных.
function roundDisplayNumber(value: number): number {
  return Math.round(value * 100) / 100
}

// Общий рендер значения характеристики объявления — единственное место
// (раньше было продублировано в ad-detail.tsx и ad-moderation-detail.tsx,
// причём в модерации без единицы измерения вовсе — "Мощность: 500", 500
// чего, не видно). rawFeatures — это Ad.features целиком (не одно
// значение), потому что для NUMBER-полей нужно заглянуть в соседние
// company-поля "${name}__unit" и "${name}__sellerValue"/"__sellerUnit"
// (см. normalize-feature-units.ts).
export function formatFeatureValue(feature: ICategoryFeature, rawFeatures: Record<string, unknown>): string | null {
  const value = rawFeatures[feature.name]

  if (value === null || value === undefined || value === '') return null

  if (feature.type === 'BOOLEAN') return value ? 'Да' : 'Нет'
  if (Array.isArray(value)) return value.length ? value.join(', ') : null

  if (feature.type !== 'NUMBER') return String(value)

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value)

  const storedUnit = rawFeatures[`${feature.name}__unit`]
  const unit = typeof storedUnit === 'string' ? storedUnit : feature.units?.[0]
  const canonicalText = unit ? `${roundDisplayNumber(numericValue)} ${unit}` : String(roundDisplayNumber(numericValue))

  // Продавец вводил не в канонической единице (130 л.с., а не 95.62 кВт,
  // см. normalizeFeatureUnits) — на странице объявления показываем то, что
  // он реально ввёл: это его число, ему и должно быть привычно видно на
  // собственном объявлении. Пересчёт в каноническую единицу — только
  // справочно, в скобках.
  const sellerValueRaw = rawFeatures[`${feature.name}__sellerValue`]
  const sellerUnit = rawFeatures[`${feature.name}__sellerUnit`]

  if (typeof sellerValueRaw === 'number' && typeof sellerUnit === 'string') {
    return `${roundDisplayNumber(sellerValueRaw)} ${sellerUnit} (≈${canonicalText})`
  }

  return canonicalText
}
