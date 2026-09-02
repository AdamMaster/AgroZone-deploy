import { Suspense } from 'react'

import { CatalogBreadcrumbs, CategoryGrid, CategoryMenu } from '@/components/features/categories/components'
import { categoriesService } from '@/components/features/categories/services'
import { Footer, Header, MobileTabBar } from '@/components/layout'

export default async function MainLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const categories = await categoriesService.findAll()

  return (
    <>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <CategoryGrid categories={categories} />
      <CatalogBreadcrumbs />
      <CategoryMenu />
      <main className='flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom)_+_40px)] sm:pb-0 sm:pb-14'>{children}</main>
      <Footer />
      <MobileTabBar />
    </>
  )
}
