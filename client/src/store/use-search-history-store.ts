import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Сколько последних запросов помним.
const MAX_QUERIES = 10

interface SearchHistoryStore {
  // Последние запросы пользователя, самый свежий первым.
  queries: string[]
  add: (query: string) => void
  remove: (query: string) => void
  clear: () => void
}

const isSame = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// Недавние запросы в строке поиска (как у Авито: нажал на строку — видишь, что
// искал раньше). Хранятся только в этом браузере (localStorage через zustand
// persist), без авторизации и без сервера. Сохраняется только отправленный
// поиск, а не каждый набранный символ и не выбранная подсказка.
export const useSearchHistoryStore = create<SearchHistoryStore>()(
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
    { name: 'search-history' }
  )
)
