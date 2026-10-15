import type { Category } from '../types/category.types'

// fullPath → категория, для всего дерева. Тот же приём, что buildCategoryMap
// на сайте: экран каталога знает только путь категории, а нужны её id,
// название и дети.
export function buildCategoryMap(roots: readonly Category[]): Map<string, Category> {
  const map = new Map<string, Category>()

  const visit = (category: Category) => {
    map.set(category.fullPath, category)
    category.children?.forEach(visit)
  }

  roots.forEach(visit)

  return map
}

// Цепочка от корня до категории — для хлебных крошек каталога.
export function getCategoryTrail(map: Map<string, Category>, fullPath: string): Category[] {
  const segments = fullPath.split('/')
  const trail: Category[] = []

  for (let index = 1; index <= segments.length; index++) {
    const category = map.get(segments.slice(0, index).join('/'))
    if (!category) break
    trail.push(category)
  }

  return trail
}
