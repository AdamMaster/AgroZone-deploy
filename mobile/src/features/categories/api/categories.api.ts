import { apiClient } from '@/lib/api/api-client'

import type { Category, CategoryFeature } from '../types/category.types'

export const categoriesApi = {
  fetchTree: (signal?: AbortSignal) => apiClient.get<Category[]>('/categories', { signal }),

  fetchFeatures: (categoryId: string, signal?: AbortSignal) =>
    apiClient.get<CategoryFeature[]>(`/categories/${encodeURIComponent(categoryId)}/features`, { signal })
}
