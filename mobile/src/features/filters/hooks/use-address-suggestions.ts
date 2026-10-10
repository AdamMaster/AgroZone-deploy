import { useQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

import { type AddressSuggestion, suggestAddresses } from '../api/dadata.api'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300
const EMPTY_SUGGESTIONS: readonly AddressSuggestion[] = []

// Подсказки адресов для поиска по радиусу: запрос — когда пользователь
// перестал печатать.
export function useAddressSuggestions(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS)
  const isEnabled = debouncedQuery.length >= MIN_QUERY_LENGTH

  const { data, isFetching } = useQuery({
    queryKey: ['dadata', 'address', debouncedQuery],
    queryFn: ({ signal }) => suggestAddresses(debouncedQuery, signal),
    enabled: isEnabled,
    staleTime: Infinity,
    // Пока печатают дальше, показываем прошлые подсказки, а не пустоту.
    placeholderData: previous => previous
  })

  return {
    suggestions: query.trim().length < MIN_QUERY_LENGTH ? EMPTY_SUGGESTIONS : (data ?? EMPTY_SUGGESTIONS),
    isLoading: isEnabled && isFetching
  }
}
