import { api } from '@/shared/api'

import { SearchSuggestion } from '../types'

class SearchService {
  private URL = 'search'

  async getSuggestions(q: string): Promise<SearchSuggestion[]> {
    const query = q?.trim()

    if (!query || query.length < 2) return []

    return api.get<SearchSuggestion[]>(`${this.URL}/suggestions`, {
      params: { q: query }
    })
  }
}

export const searchService = new SearchService()
