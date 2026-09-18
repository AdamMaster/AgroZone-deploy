import { CategoryFeature } from '@/generated/prisma/client'

const FEATURE_VALUE_SUFFIXES = ['__unit', '__sellerValue', '__sellerUnit'] as const

/**
 * Значения характеристик объявления (Ad.features) привязаны к конкретной
 * категории через CategoryFeature.name — при смене категории объявления
 * (AdsService.setCategoryByAdmin) значения от прежней категории не должны
 * молча утекать в новую. Оставляем значение только для полей, которые есть
 * И в старом, И в новом наборе характеристик категории — под одним и тем
 * же именем И с одним и тем же типом (NUMBER/SELECT/...). Тип обязателен:
 * иначе, например, число "5" от старой NUMBER-фичи "capacity" могло бы
 * просочиться в новую SELECT-фичу с тем же именем "capacity", но другим
 * набором опций. Всё остальное — в том числе служебные суффиксы
 * __unit/__sellerValue/__sellerUnit того же поля (см. normalizeFeatureUnits
 * на клиенте) — отбрасывается.
 *
 * Тот же принцип реализован независимо на клиенте (см.
 * client/src/components/features/ads/utils/reconcile-category-features.ts)
 * для формы редактирования объявления продавцом — но их нельзя переиспользовать
 * буквально одним модулем: типы Prisma (CategoryFeature) и клиентские
 * (ICategoryFeature) — разные объявления, общий пакет между apps в этом
 * проекте не настроен. Здесь эта функция — ещё и defense-in-depth для
 * AdsController PATCH admin/:id/category: клиент (AdminSetAdCategoryDialog)
 * и так шлёт уже реконсиленный объект, но эндпоинт не должен полагаться
 * только на добросовестность клиента — тот же принцип, что явный `select`
 * против утечки password в UserService.setPremiumByAdmin.
 */
export function reconcileCategoryFeatures(
  incoming: Record<string, unknown> | null | undefined,
  oldFeatures: Pick<CategoryFeature, 'name' | 'type'>[],
  newFeatures: Pick<CategoryFeature, 'name' | 'type'>[]
): Record<string, unknown> {
  if (!incoming) return {}

  const oldTypeByName = new Map(oldFeatures.map(f => [f.name, f.type]))
  const keptNames = new Set(newFeatures.filter(f => oldTypeByName.get(f.name) === f.type).map(f => f.name))

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(incoming)) {
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
