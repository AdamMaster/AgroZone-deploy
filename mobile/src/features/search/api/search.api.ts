import { apiClient } from '@/lib/api/api-client'

import type { SearchSuggestion } from '../types/search.types'

export const searchApi = {
  fetchSuggestions: (query: string, signal?: AbortSignal) =>
    apiClient.get<SearchSuggestion[]>('/search/suggestions', { params: { q: query }, signal })
}
