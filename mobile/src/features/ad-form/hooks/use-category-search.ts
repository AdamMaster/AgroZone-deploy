import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { categoriesApi } from '@/features/categories/api/categories.api'
import type { Category } from '@/features/categories/types/category.types'

import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { rankNameMatch, sharesRussianStem, splitWords } from '@/shared/utils/text-similarity'

// Листовая категория с путём от корня — по пути ищем, по названию
// ранжируем.
interface LeafCategory {
  category: Category
  path: readonly string[]
}

export interface CategorySearchItem {
  key: string
  label: string
  // Раздел, в котором лежит категория: одноимённые («Прочее», «Семена»)
  // встречаются в разных разделах.
  hint?: string
  categoryId: string
}

const SEMANTIC_MIN_QUERY_LENGTH = 2
const SEMANTIC_DEBOUNCE_MS = 300

function collectLeaves(categories: readonly Category[], parentPath: readonly string[] = []): LeafCategory[] {
  return categories.flatMap(category => {
    const path = [...parentPath, category.name]

    return category.children?.length ? collectLeaves(category.children, path) : [{ category, path }]
  })
}

// Поиск категории для объявления — как CategoryCascader сайта на телефоне:
// только листовые категории (объявление подаётся в конечную), совпадение
// подстрокой или по основе каждого слова запроса с любым словом пути,
// сначала точные по названию; следом — смысловые подсказки сервера,
// которых нет среди найденных.
export function useCategorySearch(roots: readonly Category[], query: string) {
  const leaves = useMemo(() => collectLeaves(roots), [roots])
  const term = query.trim().toLowerCase()
  const debouncedTerm = useDebouncedValue(term, SEMANTIC_DEBOUNCE_MS)

  const semantic = useQuery({
    queryKey: ['categories', 'search-suggest', debouncedTerm],
    queryFn: ({ signal }) => categoriesApi.searchSuggest(debouncedTerm, signal),
    enabled: debouncedTerm.length >= SEMANTIC_MIN_QUERY_LENGTH,
    staleTime: Infinity
  })

  const items = useMemo<CategorySearchItem[]>(() => {
    if (!term) return []

    const queryWords = splitWords(term)

    const local = leaves
      .filter(({ path }) => {
        const pathText = path.join(' ').toLowerCase()
        if (pathText.includes(term)) return true

        const pathWords = splitWords(pathText)
        return queryWords.every(queryWord => pathWords.some(pathWord => sharesRussianStem(queryWord, pathWord)))
      })
      .map(leaf => ({ leaf, rank: rankNameMatch(leaf.category.name, term) }))
      .sort((a, b) => a.rank - b.rank || a.leaf.category.name.length - b.leaf.category.name.length)
      .map(({ leaf }) => ({
        key: leaf.category.id,
        label: leaf.category.name,
        hint: leaf.path.at(-2),
        categoryId: leaf.category.id
      }))

    const localIds = new Set(local.map(item => item.categoryId))
    const remote =
      term.length >= SEMANTIC_MIN_QUERY_LENGTH && semantic.data
        ? semantic.data
            .filter(suggestion => !localIds.has(suggestion.id))
            .map(suggestion => ({
              key: suggestion.id,
              label: suggestion.name,
              hint: suggestion.parentName ?? undefined,
              categoryId: suggestion.id
            }))
        : []

    return [...local, ...remote]
  }, [leaves, term, semantic.data])

  return { items, isLoading: term.length >= SEMANTIC_MIN_QUERY_LENGTH && semantic.isFetching }
}
