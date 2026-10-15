import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// Сколько последних запросов помним.
const MAX_QUERIES = 10

interface SearchHistoryState {
  // Последние запросы пользователя, самый свежий первым.
  queries: string[]
  add: (query: string) => void
  remove: (query: string) => void
  clear: () => void
}

const isSame = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// Недавние запросы в строке поиска — useSearchHistoryStore сайта (там
// localStorage, здесь хранилище приложения). Хранятся только на этом
// устройстве. Сохраняется только отправленный поиск, а не каждый набранный
// символ и не выбранная подсказка.
export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    set => ({
      queries: [],
      add: query => {
        const value = query.trim()

        if (!value) return

        // Тот же запрос (без учёта регистра) не дублируется, а поднимается наверх.
        set(state => ({
          queries: [value, ...state.queries.filter(item => !isSame(item, value))].slice(0, MAX_QUERIES)
        }))
      },
      remove: query => set(state => ({ queries: state.queries.filter(item => item !== query) })),
      clear: () => set({ queries: [] })
    }),
    {
      name: 'agrozone.search-history',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
)
