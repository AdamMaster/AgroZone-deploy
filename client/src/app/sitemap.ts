import { MetadataRoute } from 'next'

import { adsService } from '@/components/features/ads/services'
import { categoriesService } from '@/components/features/categories/services'
import { ICategory } from '@/components/features/categories/types/categories.types'
import { LEGAL_DETAILS } from '@/components/features/legal/legal-details'

const SITE_URL = `https://${LEGAL_DETAILS.siteUrl}`

// Пересобираем не чаще раза в час — объявления и категории меняются
// нередко, но карту сайта и так читают в основном поисковые роботы, а не
// живые пользователи; на каждый их заход дёргать бэкенд незачем.
export const revalidate = 3600

// Google и Яндекс ограничивают один sitemap-файл 50 000 адресами. Сейчас
// объявлений на площадке единицы (см. тестовые данные, ROADMAP.md → U10),
// но потолок оставляем с запасом на рост, а не жёстко под текущее
// количество — просто как safety net на случай аномального роста базы,
// чтобы sitemap не пытался вытянуть миллион строк за один заход.
const MAX_ADS_IN_SITEMAP = 10000
const ADS_PAGE_SIZE = 50

// CategoriesService.findAll отдаёт дерево (см. CategoriesService на
// бэкенде — build() рекурсивно кладёт детей в children), а не плоский
// список, поэтому для карты сайта разворачиваем его в один массив.
function flattenCategories(categories: ICategory[]): ICategory[] {
  return categories.flatMap(category => [
    category,
    ...(category.children?.length ? flattenCategories(category.children) : [])
  ])
}

interface SitemapAdEntry {
  id: string
  updatedAt: Date
}

async function getPublishedAdEntries(): Promise<SitemapAdEntry[]> {
  try {
    const firstPage = await adsService.findAll({ page: 1, limit: ADS_PAGE_SIZE })

    const totalPages = Math.min(
      Math.ceil(firstPage.total / ADS_PAGE_SIZE),
      Math.ceil(MAX_ADS_IN_SITEMAP / ADS_PAGE_SIZE)
    )

    const restPages = await Promise.all(
      Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
        adsService.findAll({ page: index + 2, limit: ADS_PAGE_SIZE }).catch(() => ({ items: [] }))
      )
    )

    return [firstPage, ...restPages].flatMap(page =>
      page.items.map(ad => ({ id: ad.id, updatedAt: new Date(ad.updatedAt) }))
    )
  } catch {
    // Карта сайта не должна падать целиком из-за временной недоступности
    // API — лучше отдать её без объявлений (статика и категории всё равно
    // проиндексируются), чем 500 на /sitemap.xml.
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/help`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/safety`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.1 }
  ]

  const [categories, adEntries] = await Promise.all([
    categoriesService.findAll().catch(() => [] as ICategory[]),
    getPublishedAdEntries()
  ])

  const categoryEntries: MetadataRoute.Sitemap = flattenCategories(categories).map(category => ({
    url: `${SITE_URL}/catalog/${category.fullPath}`,
    changeFrequency: 'daily',
    priority: 0.7
  }))

  const adEntriesSitemap: MetadataRoute.Sitemap = adEntries.map(ad => ({
    url: `${SITE_URL}/ads/${ad.id}`,
    lastModified: ad.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6
  }))

  return [...staticEntries, ...categoryEntries, ...adEntriesSitemap]
}
