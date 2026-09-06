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
      {/* CatalogBreadcrumbs и CategoryMenu смонтированы на каждой странице
      (в т.ч. на главной, где оба ничего не показывают: у хлебных крошек
      breadcrumbItems пуст вне /catalog, а меню закрыто по умолчанию), но
      раньше каждый из них тянул те же категории самостоятельным клиентским
      useCategories() — то есть /categories реально уходил на бэкенд по
      второму и третьему разу поверх вот этого серверного запроса.
      Подтверждено трассировкой сети в реальном браузере (см. ROADMAP.md,
      P3): на главной было ровно два лишних клиентских GET /categories.
      Передаём уже полученный на сервере categories пропом, как и в
      CategoryGrid — отдельные клиентские запросы больше не нужны. */}
      <CatalogBreadcrumbs categories={categories} />
      <CategoryMenu categories={categories} />
      <main className='flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom)_+_40px)] sm:pb-0 sm:pb-14'>{children}</main>
      <Footer />
      <MobileTabBar />
    </>
  )
}
