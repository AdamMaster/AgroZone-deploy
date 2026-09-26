import { UserType } from '@/components/features/auth/types'
import { LEGAL_DETAILS, SITE_URL } from '@/components/features/legal/legal-details'

import { PRICE_UNITS_SHORT } from '@/shared/constants/units'

// Общие билдеры JSON-LD (schema.org) для всего сайта — S5 в ROADMAP.md.
// До этой задачи структурированных данных не было вообще. Рендерятся через
// <JsonLd> (components/layout/json-ld.tsx) отдельным
// <script type="application/ld+json"> в серверных компонентах страниц —
// сами билдеры ничего не рендерят, только собирают обычные JS-объекты.

// Organization — сведения о самой площадке, для главной страницы. logo —
// SVG: Google в документации по логотипу прямо разрешает SVG наравне с
// PNG/JPG для этого поля (в отличие от og:image, где SVG большинство
// соцсетей не показывает вовсе — см. shared/utils/metadata.ts).
export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: LEGAL_DETAILS.siteName,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.svg`
  }
}

// WebSite + SearchAction — даёт Google основание показать под сайтом в
// выдаче встроенную строку поиска ("Sitelinks search box"). Целевой шаблон
// URL — ровно то, что реально делает SearchBar при сабмите (см.
// search-bar.tsx: router.push(`/catalog?search=${...}`)) — если когда-нибудь
// поменяется параметр или маршрут поиска, поправить нужно синхронно в обоих
// местах.
export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: LEGAL_DETAILS.siteName,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/catalog?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  }
}

export interface JsonLdBreadcrumbItem {
  name: string
  // Путь от корня сайта (например '/catalog/tehnika'). Не задан — значит
  // это текущая страница без собственного адреса в цепочке (крайний
  // случай, на практике не используется, но тип оставлен опциональным на
  // будущее).
  path?: string
}

// BreadcrumbList — используется и у категорий каталога, и у объявления.
// Принимает уже готовый список (то же самое, что строят видимые
// хлебные крошки — CatalogBreadcrumbs/CategoryBreadcrumbs), а не строит его
// заново: одна и та же цепочка не должна разъезжаться между тем, что видит
// пользователь, и тем, что видит поисковик.
export function buildBreadcrumbListJsonLd(items: JsonLdBreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: `${SITE_URL}${item.path}` } : {})
    }))
  }
}

interface ProductJsonLdAd {
  id: string
  title: string
  description: string
  price: number | null
  unit?: string
  images: string[]
  user?: { displayName: string; type?: UserType }
  category?: { name: string }
}

// Product + Offer — на странице объявления. Раньше при отсутствии цены
// ("Цена договорная", price: null/0) отдавался Product без offers, из
// расчёта "это тоже валидная разметка, просто без ценового сниппета" — по
// факту оказалось не так: Google Search Console помечает такой Product как
// НЕДЕЙСТВИТЕЛЬНЫЙ ("Задайте значение для offers, review или
// aggregateRating"), а не просто "без обогащения" — у нас на сайте нет ни
// одного из этих трёх полей вовсе (отзывов/рейтингов тоже нет), так что
// такая страница не может быть валидным Product в принципе. Поэтому теперь
// для объявлений без цены билдер возвращает null — сама функция ничего не
// решает про то, рендерить ли JsonLd, это на вызывающей стороне (см.
// app/(main)/ads/[id]/page.tsx, там же фильтруются null-значения из
// массива перед JSON.stringify).
export function buildProductJsonLd(ad: ProductJsonLdAd) {
  const hasPrice = typeof ad.price === 'number' && ad.price > 0

  if (!hasPrice) return null

  const url = `${SITE_URL}/ads/${ad.id}`
  const unitText = ad.unit ? PRICE_UNITS_SHORT[ad.unit] : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ad.title,
    description: ad.description,
    image: ad.images,
    url,
    ...(ad.category?.name && { category: ad.category.name }),
    offers: {
      '@type': 'Offer',
      url,
      price: ad.price,
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      // Цена "за тонну"/"за кг" и т.п. — существенная часть смысла цены
      // для оптовой агроплощадки (см. formatPriceWithUnit), поэтому кроме
      // плоского price/priceCurrency (обязательных для Offer) добавляем
      // ещё и priceSpecification с единицей, когда она содержательна
      // (ITEM/неизвестная — "цена целиком", уточнять нечего).
      ...(unitText && {
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: ad.price,
          priceCurrency: 'RUB',
          unitText
        }
      }),
      ...(ad.user?.displayName && {
        seller: {
          '@type': ad.user.type === UserType.Individual ? 'Person' : 'Organization',
          name: ad.user.displayName
        }
      })
    }
  }
}

interface ItemListEntry {
  id: string
  title: string
}

// ItemList — на страницах каталога/категории, для уже отрисованного на
// сервере первого экрана объявлений (initialAds, см. S1 в ROADMAP.md).
// Дальнейшие страницы, подгружаемые кнопкой «Показать ещё», сознательно не
// попадают сюда — их и в изначальном HTML нет, а JSON-LD должен описывать
// именно то, что реально отдано в разметке при заходе поискового робота.
export function buildAdsItemListJsonLd(ads: ItemListEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: ads.map((ad, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/ads/${ad.id}`,
      name: ad.title
    }))
  }
}
