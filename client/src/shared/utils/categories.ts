import { ICategory, ICategoryFeature } from '@/components/features/ads/types/ad.types'

export interface IFlatCategory {
  id: string
  name: string
  path: string[]
  categoryFeatures: ICategoryFeature[]
  // Есть ли у категории подкатегории — раньше подсказки поиска в
  // CategoryCascader не различали листовые и промежуточные категории:
  // клик по категории с детьми молча закрывал список и ничего не выбирал
  // (categoryId оставался пустым), выглядело как будто клик не сработал.
  // Теперь по этому флагу рендерим разное поведение/подсказку для таких
  // пунктов (см. CategoryCascader).
  hasChildren: boolean
}

export const flattenCategories = (cats: ICategory[], parentPath: string[] = []): IFlatCategory[] => {
  return cats.flatMap((cat): IFlatCategory[] => {
    const currentPath = [...parentPath, cat.name]
    const hasChildren = !!cat.children?.length

    const current: IFlatCategory = {
      id: cat.id,
      name: cat.name,
      path: currentPath,
      categoryFeatures: cat.categoryFeatures || [],
      hasChildren
    }

    const children = hasChildren ? flattenCategories(cat.children!, currentPath) : []

    return [current, ...children]
  })
}

export const getPathToCategory = (categories: ICategory[], targetId: string): string[] => {
  for (const cat of categories) {
    if (cat.id === targetId) return [cat.id]
    if (cat.children) {
      const path = getPathToCategory(cat.children, targetId)
      if (path.length > 0) return [cat.id, ...path]
    }
  }
  return []
}

export const findCategoryById = (cats: ICategory[], id: string): ICategory | null => {
  for (const cat of cats) {
    if (cat.id === id) return cat
    if (cat.children) {
      const found = findCategoryById(cat.children, id)
      if (found) return found
    }
  }
  return null
}
