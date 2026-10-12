import type { Category } from '../types/category.types'

// Путь к категории от корня по её id (пусто — такой категории нет).
export function findCategoryPathById(roots: readonly Category[], id: string): Category[] {
  for (const category of roots) {
    if (category.id === id) return [category]

    if (category.children?.length) {
      const path = findCategoryPathById(category.children, id)
      if (path.length > 0) return [category, ...path]
    }
  }

  return []
}
