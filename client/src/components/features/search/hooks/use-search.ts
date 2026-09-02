import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { searchService } from '../services'
import { SearchSuggestion } from '../types'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(handler)
  }, [query])

  const { data: suggestions = [], isFetching: isLoading } = useQuery<SearchSuggestion[]>({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchService.getSuggestions(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2
  })

  return {
    query,
    setQuery,
    onSearch: setQuery,
    suggestions: query.trim().length < 2 ? [] : suggestions,
    isLoading
  }
}
