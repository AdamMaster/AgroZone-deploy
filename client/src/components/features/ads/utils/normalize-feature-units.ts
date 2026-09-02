import { convertToCanonical, isConvertible } from '@/shared/utils'

import { ICategoryFeature } from '../types/ad.types'

/**
 * Приводит числовые характеристики объявления к канонической единице
 * перед отправкой на сервер.
 *
 * dynamic-field.tsx для NUMBER-полей с несколькими единицами на выбор
 * (например power: ['кВт', 'л.с.']) пишет в форму как само число
 * (`categoryFeatures.power`), так и выбранную единицу отдельным полем
 * (`categoryFeatures.power__unit`) — раньше единица нигде не сохранялась
 * и не показывалась вовсе (см. обсуждение с пользователем). Тут, перед
 * отправкой формы, оба поля сводятся в одну пару: числовое значение
 * пересчитывается в каноническую единицу (units[0] у фичи), если единицы
 * физически совместимы (см. isConvertible в unit-conversion.ts) — тогда
 * `power__unit` в итоге всегда равен канонической единице. Если единицы
 * разной физической природы (например package_size: ['мл', 'л', 'г',
 * 'кг'] — выбор между объёмом и массой, а не единицы одной величины) —
 * пересчёт не производится, число остаётся как ввёл продавец, но выбранная
 * единица всё равно сохраняется — только уже как есть, без конвертации.
 * В обоих случаях после normalizeFeatureUnits верно: значение
 * `categoryFeatures[name]` всегда выражено именно в той единице, что
 * указана в `categoryFeatures[name + '__unit']`.
 *
 * Технические (не относящиеся к товару) `${name}__unit`-поля не мешают
 * бэкенду: AdsService.resolveFeatureFilters сверяет ключи с реальными
 * CategoryFeature.name текущей категории и молча игнорирует всё
 * незнакомое (в т.ч. "power__unit" — там просто нет такой фичи).
 */
export function normalizeFeatureUnits(
  categoryFeatures: Record<string, unknown> | undefined,
  features: ICategoryFeature[]
): Record<string, unknown> {
  if (!categoryFeatures) return {}

  const result: Record<string, unknown> = { ...categoryFeatures }

  for (const feature of features) {
    if (feature.type !== 'NUMBER' || !feature.units?.length) continue

    const raw = categoryFeatures[feature.name]
    if (raw === null || raw === undefined || raw === '') continue

    const value = Number(raw)
    if (!Number.isFinite(value)) continue

    const canonicalUnit = feature.units[0]
    const chosenUnit = (categoryFeatures[`${feature.name}__unit`] as string | undefined) ?? canonicalUnit
    const convertible = isConvertible(feature.units)

    // Единицы физически несовместимы (объём/масса и т.п.) — пересчёт не
    // производится (см. convertToCanonical), сохраняем ровно то, что
    // ввёл продавец, и подписываем именно chosenUnit, а не canonicalUnit.
    result[feature.name] = convertible ? convertToCanonical(value, chosenUnit, canonicalUnit) : value
    result[`${feature.name}__unit`] = convertible ? canonicalUnit : chosenUnit
  }

  return result
}
