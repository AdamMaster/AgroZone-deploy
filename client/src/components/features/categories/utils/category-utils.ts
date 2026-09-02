import { ICategory } from '../types'

export interface CategoryLookup {
  category: ICategory
  parent: ICategory | null
}

export const buildCategoryMap = (
  categories: ICategory[],
  parent: ICategory | null = null,
  map = new Map<string, CategoryLookup>()
) => {
  for (const category of categories) {
    map.set(category.fullPath, {
      category,
      parent
    })

    if (category.children?.length) {
      buildCategoryMap(category.children, category, map)
    }
  }

  return map
}
