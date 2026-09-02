'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { categoriesService } from '../services'
import { ICategorySearchSuggestion } from '../types/categories.types'

// Семантические подсказки категории по свободному тексту (см.
// CategoryCascader) — например "туи" находит "Саженцы хвойных пород".
// Дебаунс и react-query — по тому же образцу, что и use-search.ts у поиска
// по объявлениям, чтобы не дёргать бэкенд на каждое нажатие клавиши.
export function useCategorySearchSuggest(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(handler)
  }, [query])

  const { data: suggestions = [], isFetching: isLoading } = useQuery<ICategorySearchSuggestion[]>({
    queryKey: ['category-search-suggest', debouncedQuery],
    queryFn: () => categoriesService.searchSuggest(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2
  })

  return {
    suggestions: query.trim().length < 2 ? [] : suggestions,
    isLoading
  }
}
