// Категория из GET /categories (CategoriesService.findAll на сервере):
// дерево — корни с вложенными children. Описаны только поля, которые
// использует приложение.
export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  level: number
  // Путь из слагов от корня: «agrokultury/zernovye/pshenica» — как в адресе
  // каталога сайта (/catalog/<fullPath>).
  fullPath: string
  // Единицы цены (ключи enum PriceUnit: 'TON', 'KG', ...). Реально заданы
  // только у листовых категорий, см. getEffectivePriceUnits.
  priceUnits?: string[]
  children?: Category[]
}

// Характеристика товаров категории (GET /categories/:id/features) — по ним
// строятся дополнительные фильтры каталога («Год выпуска», «Марка», ...).
export type CategoryFeatureType = 'TEXT' | 'NUMBER' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN'

export interface CategoryFeature {
  id: string
  // Ключ характеристики в объявлении и в фильтре (features[name]).
  name: string
  label: string
  type: CategoryFeatureType
  options?: string[]
  // Первая единица — каноническая: в ней значения хранятся и фильтруются.
  units?: string[]
  filterable: boolean
}

export interface CategoryLookup {
  category: Category
  parent: Category | null
}
