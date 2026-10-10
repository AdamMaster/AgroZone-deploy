import { View } from 'react-native'

import { isLeafCategory, useFilterableFeatures } from '@/features/categories/hooks/use-category-features'
import type { Category } from '@/features/categories/types/category.types'

import { getEffectivePriceUnits } from '../lib/price-units'
import type { CatalogFilters, FeatureFilterValue } from '../types/filter.types'
import { CategoryPicker } from './category-picker'
import { FeatureFilterField } from './feature-filter-field'
import { LocationFilterSection } from './location-filter-section'
import { PriceRangeFilter } from './price-range-filter'
import { SellerTypeFilter } from './seller-type-filter'

interface FilterFormProps {
  draft: CatalogFilters
  onPatch: (patch: Partial<CatalogFilters>) => void
  onFeatureChange: (name: string, value: FeatureFilterValue | undefined) => void
  // Категория текущей выдачи; нет — главная или весь каталог.
  category: Category | undefined
  roots: readonly Category[]
  pendingCategory: Category | undefined
  onSelectCategory: (category: Category) => void
}

// Поля фильтра — тот же состав и порядок, что у Filter сайта:
//  - без категории: категория, цена (по единицам всего каталога), место;
//  - в категории: цена, подкатегория (если есть), место, тип продавца и
//    характеристики (только у листовой категории).
export function FilterForm({
  draft,
  onPatch,
  onFeatureChange,
  category,
  roots,
  pendingCategory,
  onSelectCategory
}: FilterFormProps) {
  const features = useFilterableFeatures(category)

  const price = (
    <PriceRangeFilter
      value={{ unit: draft.unit, minPrice: draft.minPrice, maxPrice: draft.maxPrice }}
      priceUnits={getEffectivePriceUnits(category ? [category] : roots)}
      onChange={onPatch}
    />
  )
  const location = <LocationFilterSection value={draft} onChange={onPatch} />

  if (!category) {
    return (
      <View className='gap-6'>
        <CategoryPicker categories={roots} selected={pendingCategory} onSelect={onSelectCategory} />
        {price}
        {location}
      </View>
    )
  }

  return (
    <View className='gap-6'>
      {price}
      {!isLeafCategory(category) && (
        <CategoryPicker categories={category.children ?? []} selected={pendingCategory} onSelect={onSelectCategory} />
      )}
      {location}
      <SellerTypeFilter value={draft.sellerType} onChange={sellerType => onPatch({ sellerType })} />
      {features.map(feature => (
        <FeatureFilterField
          key={feature.id}
          feature={feature}
          value={draft.features[feature.name]}
          onChange={value => onFeatureChange(feature.name, value)}
        />
      ))}
    </View>
  )
}
