import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async getSearchSuggestions(qRaw: string) {
    try {
      const q = this.normalize(qRaw)

      if (!q || q.length < 2) {
        return []
      }

      // Для ILIKE спецсимволы запроса (% _ \) экранируем, иначе «20%» или «а_б»
      // превращаются в шаблоны.
      const qLike = q.replace(/[\\%_]/g, '\\$&')

      const [categories, ads] = await Promise.all([
        this.prisma.$queryRaw<any[]>`
        SELECT
          c.id,
          c.name,
          c.slug,
          c.full_path,
          p.name AS parent_name,
          similarity(c.name, ${q}) *
          CASE
            WHEN c.name ILIKE ${q + '%'} THEN 1.5
            WHEN c.name ILIKE ${'%' + q + '%'} THEN 1.0
            ELSE 0.8
          END AS score
        FROM categories c
        LEFT JOIN categories p ON p.id = c.parent_id
        WHERE c.name % ${q}
        ORDER BY score DESC
        LIMIT 5
      `,

        this.prisma.$queryRaw<any[]>`
        SELECT * FROM (
          SELECT DISTINCT ON (a.title)
            a.id,
            a.title,
            a.slug,
            c.full_path AS category_full_path,
            GREATEST(
              similarity(lower(a.title), ${q}),
              word_similarity(${q}, lower(a.title))
            ) *
            CASE
              WHEN a.title ILIKE ${qLike + '%'} THEN 1.5
              WHEN a.title ILIKE ${'%' + qLike + '%'} THEN 1.0
              ELSE 0.7
            END AS score
          FROM ads a
          LEFT JOIN categories c ON a.category_id = c.id
          WHERE
            a.status = 'PUBLISHED'
            AND (a.expires_at IS NULL OR a.expires_at > NOW())
            -- Подстрока (ILIKE) ловит «сметан» в длинном названии, где триграммное
            -- сходство всего заголовка с коротким запросом ниже порога %;
            -- % оставлен для опечаток. Оба условия обслуживает GIN ads_title_trgm.
            AND (a.title ILIKE ${'%' + qLike + '%'} OR lower(a.title) % ${q})
          ORDER BY a.title, score DESC
        ) AS unique_ads
        ORDER BY score DESC -- ⚡ Вот теперь итоговый результат сортируется строго по качеству совпадения!
        LIMIT 10
      `
      ])

      const categoryItems = categories.map(category => ({
        id: category.id,
        type: 'category' as const,
        rawName: category.name,
        name: category.name,
        parentName: category.parent_name,
        slug: category.slug,
        url: `/catalog/${category.full_path || category.slug}`,
        score: Number(category.score || 0)
      }))

      const adItems = ads.map(ad => ({
        id: ad.id,
        type: 'ad' as const,
        rawName: ad.title,
        name: ad.title,
        slug: ad.slug,
        url: `/catalog/${ad.category_full_path || ''}?search=${encodeURIComponent(ad.title)}`,
        score: Number(ad.score)
      }))

      return [...categoryItems, ...adItems].sort((a, b) => b.score - a.score).slice(0, 10)
    } catch (e) {
      console.error('SEARCH ERROR:', e)
      throw e
    }
  }

  private normalize(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ')
  }
}
