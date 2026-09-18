import { ICategoryFeature } from '../types/ad.types'

const FEATURE_VALUE_SUFFIXES = ['__unit', '__sellerValue', '__sellerUnit'] as const

/**
 * При смене категории в CategoryCascader (форма продавца — AdForm, и
 * админский диалог смены категории — AdminSetAdCategoryDialog) значения
 * `categoryFeatures.*` привязаны к КОНКРЕТНОЙ категории (см. CategoryFeature
 * в server/prisma/schema.prisma). Раньше при переключении между двумя
 * "листовыми" категориями CategoryCascader.handleCategorySelect ни разу не
 * трогал categoryFeatures в состоянии формы — старые значения просто
 * оставались висеть там же. Внешне это было незаметно: DynamicField рисует
 * поля только текущего списка `features`, так что "чужие" поля не
 * показывались. Но normalizeFeatureUnits перед отправкой на сервер спредит
 * ...categoryFeatures целиком и только потом перезаписывает совпадающие по
 * имени ключи — то есть мусор от прежней категории всё равно уходил в
 * Ad.features (см. обсуждение с пользователем).
 *
 * Оставляем значение только для полей, которые есть в ОБЕИХ категориях под
 * одним и тем же именем И с одним и тем же типом (NUMBER/SELECT/...) — тип
 * обязателен: иначе, например, число "5" от старой NUMBER-фичи "capacity"
 * могло бы утечь в новую SELECT-фичу с тем же именем "capacity", но другим
 * набором опций. Всё остальное (в т.ч. служебные __unit/__sellerValue/
 * __sellerUnit того же поля, см. normalize-feature-units.ts) — отбрасывается.
 *
 * Тот же принцип реализован независимо на сервере (см.
 * server/src/ads/utils/reconcile-category-features.util.ts) как
 * defense-in-depth для админского эндпоинта — два отдельных модуля, а не
 * общий пакет, потому что типы Prisma (CategoryFeature) и клиентские
 * (ICategoryFeature) — разные объявления, общего пакета между apps в этом
 * проекте нет.
 */
export function reconcileCategoryFeatures(
  currentValues: Record<string, unknown> | undefined,
  oldFeatures: ICategoryFeature[],
  newFeatures: ICategoryFeature[]
): Record<string, unknown> {
  if (!currentValues) return {}

  const oldTypeByName = new Map(oldFeatures.map(f => [f.name, f.type]))
  const keptNames = new Set(newFeatures.filter(f => oldTypeByName.get(f.name) === f.type).map(f => f.name))

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(currentValues)) {
    const baseName = FEATURE_VALUE_SUFFIXES.reduce(
      (name, suffix) => (key.endsWith(suffix) ? key.slice(0, -suffix.length) : name),
      key
    )

    if (keptNames.has(baseName)) {
      result[key] = value
    }
  }

  return result
}
