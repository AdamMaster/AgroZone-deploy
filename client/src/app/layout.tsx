import type { Metadata } from 'next'
import { Google_Sans, Inter } from 'next/font/google'
import { Suspense } from 'react'

import { CookieConsentBanner } from '@/components/layout'
import { AppModal } from '@/components/modals/app'
import { CategoriesModal } from '@/components/modals/categories'
import { FilterModal } from '@/components/modals/filter'
import { MainProvider } from '@/components/providers'
import { SupportChatWidget } from '@/components/features/support/components'
import { LEGAL_DETAILS, SITE_URL } from '@/components/features/legal/legal-details'

import { cn } from '@/lib/utils'

import './globals.css'

const inter = Google_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap'
})

const HOME_TITLE = 'AgroZone — Агропромышленная торговая площадка'
const HOME_DESCRIPTION = 'Всё для агробизнеса: продукция, сырьё, техника и оборудование оптом'

export const metadata: Metadata = {
  // metadataBase — без него Next не может резолвить относительные пути в
  // alternates.canonical / openGraph.url / openGraph.images (которые почти
  // везде на сайте передаются относительными, см. shared/utils/metadata.ts)
  // в абсолютные адреса: в деве он молча подставлял бы localhost, а без
  // него в проде Next вообще не подставит домен сам. Раньше metadataBase не
  // было задано вовсе (см. S3 в ROADMAP.md).
  metadataBase: new URL(SITE_URL),
  title: {
    absolute: HOME_TITLE,
    template: '%s | AgroZone'
  },
  description: HOME_DESCRIPTION,
  // Главная страница ((main)/(home)/page.tsx) не объявляет собственный
  // metadata/generateMetadata, поэтому целиком наследует этот объект —
  // canonical для неё указываем прямо здесь, а не заводим отдельный файл
  // ради одного поля.
  alternates: {
    canonical: '/'
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  },
  // Общий запасной openGraph/twitter — на случай страницы, у которой нет
  // собственного generateMetadata/metadata (Next в этом случае наследует
  // родительский целиком, в отличие от страницы, которая объявляет
  // openGraph сама — тогда родительский полностью заменяется, без
  // слияния). У всех публичных страниц сайта теперь есть собственные
  // метаданные через buildPageMetadata (см. shared/utils/metadata.ts), так
  // что этот блок — просто защитная сетка, а не то, что реально показывают
  // пользователям.
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: LEGAL_DETAILS.siteName,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: '/',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }]
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['/images/og-default.jpg']
  },
  // Подтверждение прав на сайт в Яндекс.Вебмастере и Google Search Console
  // (S2 в ROADMAP.md). Коды выдаются в соответствующей панели после
  // добавления сайта-ресурса (webmaster.yandex.ru / search.google.com/search-console)
  // и вставляются в .env на сервере — сюда их вписывать вручную не нужно и
  // не следует (это публичный репозиторий кода, а не секрет, но домен
  // подтверждается один раз, и держать код рядом с .env удобнее для
  // ротации). Пока переменные не заданы, Next просто не рендерит эти
  // мета-теги — старт без ошибок.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION && { google: process.env.GOOGLE_SITE_VERIFICATION }),
    ...(process.env.YANDEX_SITE_VERIFICATION && { yandex: process.env.YANDEX_SITE_VERIFICATION })
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='ru' suppressHydrationWarning className={cn('h-full', inter.variable)}>
      <body
        className={cn(
          'flex min-h-full flex-col bg-background font-sans text-[15px] text-foreground'
        )}
      >
        <MainProvider>
          {children}
          <AppModal />
          <CategoriesModal />
          {/* useCatalogFilters() внутри читает useSearchParams() сразу при
          рендере, не только когда окно реально открыто (см. filter-modal.tsx) —
          а этот компонент висит в корневом layout, то есть на каждой
          странице сайта. Без Suspense здесь ломался статический пререндер
          любого роута (сначала это всплыло на /ads/create, потом на
          /_not_found — на самом деле проблема была общая для всего сайта). */}
          <Suspense fallback={null}>
            <FilterModal />
          </Suspense>
          <CookieConsentBanner />
          <SupportChatWidget />
        </MainProvider>
      </body>
    </html>
  )
}
