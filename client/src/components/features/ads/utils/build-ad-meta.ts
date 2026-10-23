import { ICategory } from '@/components/features/categories/types/categories.types'

import { findCategoryById, formatPriceWithUnit, getPathToCategory, truncateForMeta } from '@/shared/utils'

// Слаг корневой категории «Услуги» (см. server/prisma/data/categories.ts).
// Для объявлений из неё в заголовке не ставим «купить»: по запросам вроде
// «монтаж холодильных камер цена» человек ищет исполнителя, а не покупает
// вещь, и слово «купить» только искажало бы смысл.
const SERVICES_ROOT_SLUG = 'uslugi'

const META_DESCRIPTION_MAX_LENGTH = 160

// Поля объявления, нужные для мета-данных — нарочно не весь IAd, чтобы
// функции можно было вызывать и из других мест (например, для
// OG-превью) с любым объектом нужной формы.
export interface AdMetaSource {
  title: string
  description: string
  price: number | null
  unit?: string | null
  region?: string | null
  locality?: string | null
}

// toLocaleString('ru-RU') разделяет разряды неразрывным пробелом (U+00A0 /
// U+202F). В <title> и description он ни к чему — поисковики показывают
// такие строки как есть, а обычный пробел надёжнее при копировании.
function normalizeSpaces(text: string): string {
  return text.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Цена с единицей измерения: «14 200 ₽/т». Для объявления без цены
// formatPriceWithUnit отдаёт «Цена договорная» — в описании так и оставляем, а
// в заголовке после тире используем строчную форму (см. buildAdMetaTitle).
function getPriceLabel(ad: AdMetaSource): string {
  return normalizeSpaces(formatPriceWithUnit(ad.price, ad.unit))
}

// Населённый пункт, а если он не указан, то регион — чтобы по запросам вида
// «... цена краснодар» страница совпадала с запросом. Без города и региона
// возвращает пустую строку: тогда в тексте просто нет места.
export function getAdPlace(ad: Pick<AdMetaSource, 'region' | 'locality'>): string {
  return normalizeSpaces(ad.locality || ad.region || '')
}

export function isServiceCategory(categories: ICategory[], categoryId: string): boolean {
  const rootId = getPathToCategory(categories, categoryId)[0]

  if (!rootId) return false

  return findCategoryById(categories, rootId)?.slug === SERVICES_ROOT_SLUG
}

// «Трактор МТЗ-82 — купить за 850 000 ₽, Краснодар» для товара и
// «Монтаж холодильных камер — 50 000 ₽, Краснодар» для услуги. Название
// бренда добавляет общий template в app/layout.tsx. Порядок — по важности:
// поисковик обрезает длинный заголовок с конца, поэтому сначала название,
// потом цена, потом город.
export function buildAdMetaTitle(ad: AdMetaSource, isService: boolean): string {
  const hasPrice = Boolean(ad.price)
  const priceLabel = hasPrice ? getPriceLabel(ad) : 'цена договорная'

  const offer = isService ? priceLabel : hasPrice ? `купить за ${priceLabel}` : `купить, ${priceLabel}`

  const place = getAdPlace(ad)

  return [`${normalizeSpaces(ad.title)} — ${offer}`, place].filter(Boolean).join(', ')
}

// «850 000 ₽ · Краснодар. Текст объявления…» — цена и место в начале
// описания, дальше столько текста объявления, сколько помещается в лимит
// сниппета. Переносы строк и повторные пробелы схлопываем: в сниппете они
// всё равно превратились бы в пробелы, но съели бы лимит.
export function buildAdMetaDescription(ad: AdMetaSource): string {
  const place = getAdPlace(ad)
  const prefix = [getPriceLabel(ad), place].filter(Boolean).join(' · ')

  const body = truncateForMeta(normalizeSpaces(ad.description), META_DESCRIPTION_MAX_LENGTH - prefix.length - 2)

  return body ? `${prefix}. ${body}` : prefix
}
