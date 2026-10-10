import type { Category, CategoryLookup } from '../types/category.types'

// fullPath → категория и её родитель, для всего дерева. Тот же приём, что
// buildCategoryMap на сайте: экран каталога знает только путь категории, а
// нужны её id, название, родитель и дети.
export function buildCategoryMap(roots: readonly Category[]): Map<string, CategoryLookup> {
  const map = new Map<string, CategoryLookup>()

  const visit = (category: Category, parent: Category | null) => {
    map.set(category.fullPath, { category, parent })
    category.children?.forEach(child => visit(child, category))
  }

  roots.forEach(root => visit(root, null))

  return map
}

// Цепочка от корня до категории — для хлебных крошек каталога.
export function getCategoryTrail(map: Map<string, CategoryLookup>, fullPath: string): Category[] {
  const segments = fullPath.split('/')
  const trail: Category[] = []

  for (let index = 1; index <= segments.length; index++) {
    const lookup = map.get(segments.slice(0, index).join('/'))
    if (!lookup) break
    trail.push(lookup.category)
  }

  return trail
}
