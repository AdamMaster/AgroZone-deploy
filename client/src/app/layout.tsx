import type { Metadata } from 'next'
import { Google_Sans, Inter } from 'next/font/google'
import { Suspense } from 'react'

import { CookieConsentBanner } from '@/components/layout'
import { AppModal } from '@/components/modals/app'
import { CategoriesModal } from '@/components/modals/categories'
import { FilterModal } from '@/components/modals/filter'
import { MainProvider } from '@/components/providers'

import { cn } from '@/lib/utils'

import './globals.css'

const inter = Google_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap'
})

export const metadata: Metadata = {
  title: {
    absolute: 'AgroZone — Агропромышленная торговая площадка',
    template: '%s | AgroZone'
  },
  description: 'Всё для агробизнеса: продукция, сырьё, техника и оборудование оптом',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png'
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
        </MainProvider>
      </body>
    </html>
  )
}
