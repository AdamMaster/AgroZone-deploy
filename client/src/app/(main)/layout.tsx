import { Suspense } from 'react'

import { AppDownloadBanner } from '@/components/features/app-download/components'
import { CatalogBreadcrumbs, CategoryGrid, CategoryMenu } from '@/components/features/categories/components'
import { categoriesService } from '@/components/features/categories/services'
import { SiteFlagsProvider } from '@/components/features/site-settings/components'
import { siteSettingsService } from '@/components/features/site-settings/services'
import { Footer, Header, MobileTabBar } from '@/components/layout'

export default async function MainLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const [categories, siteFlags] = await Promise.all([categoriesService.findAll(), siteSettingsService.getPublicFlags()])

  return (
    <SiteFlagsProvider flags={siteFlags}>
      <AppDownloadBanner />
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <CategoryGrid categories={categories} />
      <CatalogBreadcrumbs categories={categories} />
      <CategoryMenu categories={categories} />
      <main className='flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom)_+_40px)] sm:pb-0 sm:pb-14'>{children}</main>
      <Footer />
      <MobileTabBar />
    </SiteFlagsProvider>
  )
}
