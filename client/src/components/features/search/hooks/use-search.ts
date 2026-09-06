import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { searchService } from '../services'
import { SearchSuggestion } from '../types'

export function useSearch() {
  const searchParams = useSearchParams()
  // Текущий активный поиск, отражённый в URL (?search=...) — источник
  // истины (см. SearchBar.handleSearch/onClear, CatalogAdsGrid). SearchBar
  // рендерится один раз в шапке сайта (header.tsx) и не размонтируется при
  // переходах между страницами, поэтому без синхронизации ниже поле ввода
  // "застревало" со старым/пустым значением: заход на уже отфильтрованный
  // /catalog?search=... напрямую по ссылке, через "Назад" браузера, либо
  // после клика по подсказке на другой странице — во всех этих случаях
  // компонент не размонтируется, и его исходный useState('') так и остаётся
  // пустым, хотя URL и выдача уже отфильтрованы (баг из аудита U4).
  const urlQuery = searchParams.get('search') ?? ''

  const [query, setQuery] = useState(urlQuery)
  // Отслеживаем предыдущее значение urlQuery, чтобы подхватить его
  // изменение извне (навигация, "Назад"/"Вперёд", прямая ссылка) —
  // сравнение прямо в теле рендера, а не в useEffect: это рекомендованный
  // React-паттерн "adjusting state when a prop changes"
  // (https://react.dev/learn/you-might-not-need-an-effect), который не
  // порождает лишний повторный рендер эффектом и проходит правило
  // react-hooks/set-state-in-effect. Пока пользователь печатает и ещё не
  // отправил форму, urlQuery не меняется — набранный текст не трогаем.
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery)
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery)
    setQuery(urlQuery)
  }

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
