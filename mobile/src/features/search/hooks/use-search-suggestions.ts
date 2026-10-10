import { useQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

import { searchApi } from '../api/search.api'

// Те же правила, что useSearch сайта: подсказки с двух символов, запрос —
// через 300 мс после последнего нажатия.
const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

export function useSearchSuggestions(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS)

  const { data } = useQuery({
    queryKey: ['search', 'suggestions', debouncedQuery],
    queryFn: ({ signal }) => searchApi.fetchSuggestions(debouncedQuery, signal),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    // Пока печатают дальше, показываем прошлые подсказки, а не пустоту.
    placeholderData: previous => previous
  })

  return query.trim().length < MIN_QUERY_LENGTH ? [] : (data ?? [])
}
