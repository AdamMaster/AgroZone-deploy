import { apiClient } from '@/lib/api/api-client'

import type { Category, CategoryFeature, CategorySearchSuggestion } from '../types/category.types'

export const categoriesApi = {
  fetchTree: (signal?: AbortSignal) => apiClient.get<Category[]>('/categories', { signal }),

  fetchFeatures: (categoryId: string, signal?: AbortSignal) =>
    apiClient.get<CategoryFeature[]>(`/categories/${encodeURIComponent(categoryId)}/features`, { signal }),

  // Подсказки категории по свободному тексту («туи» → «Саженцы хвойных
  // пород») — смысловой поиск сервера, только листовые категории.
  searchSuggest: (query: string, signal?: AbortSignal) =>
    apiClient.get<CategorySearchSuggestion[]>('/categories/search-suggest', { params: { q: query }, signal })
}
