import { api } from '@/shared/api'

import { ICategory, ICategorySearchSuggestion } from '../types/categories.types'

class CategoriesService {
  private URL = 'categories'

  async searchSuggest(q: string): Promise<ICategorySearchSuggestion[]> {
    const query = q?.trim()

    if (!query || query.length < 2) return []

    return api.get<ICategorySearchSuggestion[]>(`${this.URL}/search-suggest`, {
      params: { q: query }
    })
  }

  async findAll() {
    // Список категорий рендерится в (main)/layout.tsx, который оборачивает
    // почти весь сайт. Без явного cache: 'no-store' Next.js по умолчанию
    // считает этот сегмент маршрута "статичным" и на 5 минут кэширует
    // отрисованный RSC-payload в клиентском Router Cache — если в момент
    // создания этого снимка бэкенд вернул пустой список (например, во время
    // prisma migrate reset), пустой список будет "залипать" при обычных
    // клиентских переходах, пока кэш не протухнет сам или не сделать hard
    // refresh. no-store гарантирует, что категории всегда запрашиваются
    // заново при каждом заходе на сайт.
    const response = await api.get<ICategory[]>(this.URL, { cache: 'no-store' })

    return response
  }
}

export const categoriesService = new CategoriesService()
