import { ICategory, ICategoryMeta } from '../types'
import { truncateForMeta } from '@/shared/utils/metadata'

export interface CategoryLookup {
  category: ICategory
  parent: ICategory | null
}

export const buildCategoryMap = (
  categories: ICategory[],
  parent: ICategory | null = null,
  map = new Map<string, CategoryLookup>()
) => {
  for (const category of categories) {
    map.set(category.fullPath, {
      category,
      parent
    })

    if (category.children?.length) {
      buildCategoryMap(category.children, category, map)
    }
  }

  return map
}


// Ищет категорию по её slug (последний сегмент пути каталога, например
// "traktory" в /catalog/tehnika/traktory) — рекурсивно по всему дереву, БЕЗ
// учёта родителя. Перенесено сюда из ads-client.tsx без изменений в логике,
// чтобы серверный компонент страницы каталога (page.tsx) и клиентские
// компоненты списка объявлений резолвили categoryId ОДИНАКОВО — иначе
// SSR-выдача и клиентский рефетч могли бы разойтись.
//
// ВАЖНО (известное ограничение, не в рамках текущей задачи S1): если у двух
// разных родительских категорий есть дочерние с одинаковым slug, найдётся
// первая по порядку обхода, а не обязательно та, что имелась в виду —
// buildCategoryMap() выше резолвит по fullPath однозначно и был бы надёжнее,
// но переключать на него сейчас — отдельное по объёму изменение поведения,
// которое стоит проверить отдельно (нет ли реальных коллизий slug в текущих
// 610 категориях), а не тихо протащить попутно с рефактором SSR.
export const findCategoryIdBySlug = (categories: ICategory[], slug?: string | null): string | undefined => {
  if (!slug) return

  for (const category of categories) {
    if (category.slug === slug) {
      return category.id
    }

    if (category.children?.length) {
      const found = findCategoryIdBySlug(category.children, slug)
      if (found) return found
    }
  }

  return
}

// Category.description — НЕ готовый текст, а список из 15-25 обиходных
// названий/сортов через запятую, который GigaChat сгенерировал для
// семантического поиска (см. подробности у CategoryMetaDto/
// CategoriesService.findMetaByFullPath на бэкенде и у ICategory на клиенте
// — почему это отдельный точечный запрос, а не поле в общем дереве
// категорий; сам промпт прямо просит GigaChat вернуть "только список через
// запятую, без вступления и пояснений"). Показать его пользователю как
// есть — значит подсунуть в meta description сырой перечень ключевых слов,
// что выглядит спамом: это данные для эмбеддингов, а не маркетинговый
// текст. Поэтому здесь он не транслируется дословно, а оборачивается в
// шаблон-предложение, куда попадают только первые несколько терминов —
// ровно так же формулируют auto-описания категорий и другие маркетплейсы
// (Avito, Ozon): название категории + несколько характерных примеров
// товаров + короткий призыв.
//
// Категории без description (ещё не обогащены GigaChat, см.
// enrich-category-descriptions.ts) получают общий шаблон без примеров —
// тот же текст, что раньше был единственным вариантом для всех категорий.
export function buildCategoryMetaDescription(category: ICategoryMeta): string {
  const terms = (category.description ?? '')
    .split(',')
    .map(term => term.trim())
    .filter(Boolean)
    .slice(0, 3)

  const description = terms.length
    ? `${category.name} на AgroZone: ${terms.join(', ')} и другие товары. Смотрите актуальные объявления от поставщиков.`
    : `Выбирайте товары в категории ${category.name} на агропромышленной площадке AgroZone. Актуальные объявления от проверенных поставщиков.`

  return truncateForMeta(description, 165)
}
