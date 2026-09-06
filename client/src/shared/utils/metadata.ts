import { Metadata } from 'next'

import { LEGAL_DETAILS } from '@/components/features/legal/legal-details'

// Дефолтная картинка для Open Graph / Twitter Card — используется на
// страницах, у которых нет собственного «предметного» изображения (у
// объявления это его фото, а у главной/каталога/статических страниц
// показать нечего). Без неё соцсети и мессенджеры при расшаривании ссылки
// либо не показывают превью вовсе, либо подставляют что попало — тут же
// всегда есть представительная карточка с брендом.
// Сгенерирована мной (client/public/images/og-default.jpg, 1200×630) —
// готового брендового 1200×630 макета в проекте не было, а вся остальная
// графика — либо векторный логотип-вордмарк (SVG, соцсети его чаще не
// показывают вовсе), либо PNG-иллюстрации категорий с прозрачным фоном на
// 14 из 610 категорий (см. category-item.tsx) — ни то ни другое как
// самостоятельная OG-картинка не годится. Если понадобится настоящий
// дизайнерский вариант — заменить этот файл, путь и размер менять не
// обязательно.
const DEFAULT_OG_IMAGE = { url: '/images/og-default.jpg', width: 1200, height: 630 }

// Обрезает текст по границе слова, не разрывая слово посередине — обычная
// проблема "голого" slice(0, N) (см. как раньше делала generateMetadata на
// странице объявления: ad.description.slice(0, 160) могло оборвать текст
// прямо в середине слова). Многоточие не добавляем — поисковики и соцсети
// сами показывают обрезанный текст с "…", свой дописывать не нужно.
export function truncateForMeta(text: string, maxLength = 160): string {
  const trimmed = text.trim()

  if (trimmed.length <= maxLength) return trimmed

  const cut = trimmed.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')

  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()
}

interface BuildPageMetadataOptions {
  title: string
  description: string
  // Путь от корня сайта БЕЗ query-строки (например '/catalog/tehnika', а
  // не '/catalog/tehnika?minPrice=100') — canonical и og:url всегда должны
  // указывать на "чистый" адрес страницы без параметров фильтра/поиска,
  // иначе каждая комбинация фильтров каталога выглядела бы для поисковика
  // отдельной страницей с дублирующимся содержимым.
  path: string
  // Есть ли у самой страницы «предметная» картинка (фото объявления и
  // т.п.) — если нет, подставляется DEFAULT_OG_IMAGE.
  images?: string[]
  // Заголовок УЖЕ содержит «AgroZone» сам по себе (так собираются заголовки
  // объявления и категории — «Трактор — купить на AgroZone»). Общий
  // `template: '%s | AgroZone'` в app/layout.tsx в этом случае приписал бы
  // бренд ещё раз («...AgroZone | AgroZone» во вкладке браузера) — этот
  // смежный нюанс уже был найден, но не исправлен при закрытии другой
  // задачи (см. ROADMAP.md, S3 «убрать дубль бренда в title»). title:
  // {absolute: ...} прицельно обходит template — используем его именно для
  // таких случаев, вместо обычной строки.
  brandInTitle?: boolean
}

// Единая сборка Metadata для страницы: title + description + canonical +
// Open Graph + Twitter Card. Раньше у каждой страницы это было по-своему —
// где-то только title, где-то только частичный openGraph (одни images, без
// title/description/url/type) — и ни у одной не было canonical вовсе (S3 в
// ROADMAP.md). Next.js не делает глубокое слияние вложенных объектов
// метаданных между layout и page (если страница указывает свой openGraph,
// он ПОЛНОСТЬЮ заменяет родительский, а не дополняет) — поэтому title,
// description и site-wide поля (locale, siteName) продублированы явно в
// каждом вызове, а не оставлены "унаследоваться" от app/layout.tsx.
export function buildPageMetadata({ title, description, path, images, brandInTitle }: BuildPageMetadataOptions): Metadata {
  const ogImages = images?.length ? images : [DEFAULT_OG_IMAGE]

  return {
    title: brandInTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: path
    },
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      siteName: LEGAL_DETAILS.siteName,
      title,
      description,
      url: path,
      images: ogImages
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages
    }
  }
}
