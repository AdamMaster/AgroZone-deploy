// Подсказка поиска (GET /search/suggestions, SearchService на сервере):
// категория или объявление. url — адрес каталога сайта
// (/catalog/<путь категории> или /catalog/<путь>?search=<название>).
export interface SearchSuggestion {
  id: string
  type: 'category' | 'ad'
  name: string
  parentName: string | null
  url: string
}
