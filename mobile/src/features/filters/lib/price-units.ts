import type { Category } from '@/features/categories/types/category.types'

import { WHOLE_PRICE_UNIT } from '@/shared/constants/price-units'

function collectUnits(category: Category, units: Set<string>) {
  if (category.children?.length) {
    category.children.forEach(child => collectUnits(child, units))
    return
  }

  const own = category.priceUnits?.length ? category.priceUnits : [WHOLE_PRICE_UNIT]
  own.forEach(unit => units.add(unit))
}

// Единицы цены, которыми пользуются товары категории и всех её
// подкатегорий — как getEffectivePriceUnits сайта. У разделов собственное
// поле priceUnits почти всегда по умолчанию (['ITEM']): реальные единицы
// заданы только у листовых категорий, поэтому собираем их с листьев. Без
// категории — по всему каталогу.
export function getEffectivePriceUnits(categories: readonly Category[]): string[] {
  const units = new Set<string>()
  categories.forEach(category => collectUnits(category, units))

  return units.size ? [...units] : [WHOLE_PRICE_UNIT]
}
